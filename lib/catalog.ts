import type { Offer } from "./store";

const GLOBAL = "https://catalog.shopify.com/api/ucp/mcp";
const SHOPIFY_PROFILE =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json";

function profileUrl() {
  return process.env.AGENT_PROFILE_URL || SHOPIFY_PROFILE;
}

function storefronts(): string[] {
  const raw = process.env.CATALOG_STOREFRONTS || "";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function storefrontUrl(host: string) {
  return `https://${host}/api/ucp/mcp`;
}

function meta() {
  return { "ucp-agent": { profile: profileUrl() } };
}

function context(country: string) {
  return { address_country: country, currency: "USD", intent: "procurement" };
}

async function rpc(url: string, name: string, catalog: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: { meta: meta(), catalog } },
    }),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, url, name };
}

function unwrap(payload: unknown): any {
  let parsed: any = payload;
  try {
    if (payload && typeof payload === "object" && "result" in (payload as object)) {
      const r = (payload as any).result;
      if (typeof r?.content?.[0]?.text === "string") {
        try {
          parsed = JSON.parse(r.content[0].text);
        } catch {
          parsed = r?.structuredContent || r;
        }
      } else {
        parsed = r?.structuredContent || r;
      }
    }
  } catch {
    parsed = payload;
  }
  return parsed;
}

function collectProducts(payload: unknown): any[] {
  const parsed = unwrap(payload);
  const products =
    parsed?.products ||
    parsed?.structuredContent?.products ||
    parsed?.catalog?.products ||
    parsed?.items ||
    parsed?.results ||
    (parsed?.product ? [parsed.product] : []);
  return Array.isArray(products) ? products : [];
}

function minorToUsd(v: unknown): string {
  if (v && typeof v === "object" && "amount" in (v as object)) return minorToUsd((v as any).amount);
  if (typeof v === "number") return (v / 100).toFixed(2);
  if (typeof v === "string" && /^\d+$/.test(v)) return (Number(v) / 100).toFixed(2);
  if (typeof v === "string") return v.replace(/^\$/, "");
  return "";
}

function availableOf(p: any, variant: any): number | null {
  const avail = variant?.availability ?? p?.availability;
  if (avail?.available === false || variant?.available === false || p?.available === false) return 0;
  if (typeof variant?.quantity === "number") return variant.quantity;
  if (typeof p?.quantity === "number") return p.quantity;
  if (avail?.available === true || variant?.available === true || p?.available === true) return null;
  return null;
}

function productIdOf(p: any): string {
  return String(p?.id || p?.product_id || p?.gid || "");
}

export type CatalogOffer = Offer & {
  product_id?: string;
  variant_id?: string;
  source?: string;
};

function offerFrom(p: any, variant: any | null, country: string, source: string): CatalogOffer {
  const seller = variant?.seller || p?.seller || {};
  const url =
    variant?.checkout_url ||
    variant?.url ||
    p?.checkout_url ||
    p?.url ||
    p?.product_url ||
    p?.online_store_url ||
    p?.link ||
    seller?.url ||
    "";
  const priceRaw =
    variant?.price?.amount ??
    variant?.price ??
    p?.price_range?.min?.amount ??
    p?.price ??
    p?.price_min ??
    p?.price?.amount;
  const price = minorToUsd(priceRaw);
  let domain = seller?.domain || "";
  if (!domain) {
    try {
      domain = url ? new URL(url).hostname : p.shop || p.merchant || "";
    } catch {
      domain = p.shop || "";
    }
  }
  const titleBits = [p.title || p.name || "Untitled", variant?.title].filter((t: string) => t && t !== p.title);
  const hasCheckout = Boolean(variant?.checkout_url || p?.checkout_url);
  return {
    rank: 0,
    merchant_domain: domain,
    title: titleBits.join(" · "),
    unit_price_usd: price || "n/a",
    quantity_available: availableOf(p, variant),
    ships_to: country,
    product_url: seller?.url || url,
    checkout_url: variant?.checkout_url || p?.checkout_url || url,
    confidence: hasCheckout ? 0.9 : url ? 0.65 : 0.3,
    product_id: productIdOf(p) || undefined,
    variant_id: variant?.id ? String(variant.id) : undefined,
    source,
  };
}

function explodeOffers(products: any[], country: string, source: string): CatalogOffer[] {
  const out: CatalogOffer[] = [];
  for (const p of products) {
    const variants = Array.isArray(p?.variants) && p.variants.length ? p.variants : [null];
    for (const v of variants) out.push(offerFrom(p, v, country, source));
  }
  return out;
}

function dedupe(offers: CatalogOffer[]): CatalogOffer[] {
  const seen = new Set<string>();
  const out: CatalogOffer[] = [];
  for (const o of offers) {
    const key = [o.merchant_domain, o.title, o.unit_price_usd, o.variant_id || o.checkout_url].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

function rankOffers(offers: CatalogOffer[], maxPrice?: number): CatalogOffer[] {
  const scored = offers.map((o) => {
    const price = Number(o.unit_price_usd);
    const under = maxPrice && Number.isFinite(price) ? price <= maxPrice : true;
    const instock = o.quantity_available === null || o.quantity_available > 0;
    const hasPay = Boolean(o.checkout_url);
    const score = (hasPay ? 8 : 0) + (instock ? 4 : 0) + (o.unit_price_usd !== "n/a" ? 2 : 0) + (under ? 1 : 0);
    return { o, score, under };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({
    ...s.o,
    rank: i + 1,
    confidence: Math.min(0.99, s.o.confidence + (s.under ? 0 : -0.15)),
  }));
}

function idsFrom(products: any[]): string[] {
  const ids: string[] = [];
  for (const p of products) {
    const id = productIdOf(p);
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

export async function searchCatalog(
  query: string,
  country: string,
  opts: { enrich?: boolean; limit?: number; maxPriceUsd?: number } = {}
): Promise<{ offers: CatalogOffer[]; rawStatus: number; error?: string; sources: string[] }> {
  const limit = Math.min(Math.max(opts.limit || 12, 1), 24);
  const catalog = {
    query,
    context: context(country),
    filters: { ships_to: { country }, available: true },
    pagination: { limit: Math.min(limit, 20) },
  };

  const sources: string[] = [];
  const errors: string[] = [];
  let products: any[] = [];
  let rawStatus = 0;

  try {
    const global = await rpc(GLOBAL, "search_catalog", catalog);
    rawStatus = global.status;
    if (global.json?.error) errors.push(`global:${JSON.stringify(global.json.error).slice(0, 240)}`);
    else {
      products = collectProducts(global.json);
      if (products.length) sources.push("global");
    }
  } catch (e) {
    errors.push(`global:${String(e)}`);
  }

  const shops = storefronts();
  if (products.length < 4 && shops.length) {
    const extra = await Promise.allSettled(shops.map((host) => rpc(storefrontUrl(host), "search_catalog", catalog)));
    for (const r of extra) {
      if (r.status !== "fulfilled") continue;
      if (r.value.json?.error) {
        errors.push(`${r.value.url}:${JSON.stringify(r.value.json.error).slice(0, 160)}`);
        continue;
      }
      const more = collectProducts(r.value.json);
      if (more.length) {
        products = products.concat(more);
        sources.push(r.value.url);
      }
    }
  }

  let offers = explodeOffers(products, country, sources[0] || "catalog");

  if (opts.enrich !== false) {
    const topIds = idsFrom(products).slice(0, 8);
    if (topIds.length) {
      try {
        const looked = await rpc(GLOBAL, "lookup_catalog", {
          ids: topIds.slice(0, 10),
          context: context(country),
          filters: { ships_to: { country }, available: true },
        });
        if (!looked.json?.error) {
          const lookedProducts = collectProducts(looked.json);
          if (lookedProducts.length) {
            offers = offers.concat(explodeOffers(lookedProducts, country, "lookup_catalog"));
            sources.push("lookup_catalog");
          }
        }
      } catch (e) {
        errors.push(`lookup:${String(e)}`);
      }

      const detailed = await Promise.allSettled(
        topIds.slice(0, 6).map((id) =>
          rpc(GLOBAL, "get_product", {
            id,
            context: context(country),
            filters: { ships_to: { country }, available: true },
          })
        )
      );
      for (const r of detailed) {
        if (r.status !== "fulfilled" || r.value.json?.error) continue;
        const dets = collectProducts(r.value.json);
        if (dets.length) {
          offers = offers.concat(explodeOffers(dets, country, "get_product"));
          if (!sources.includes("get_product")) sources.push("get_product");
        }
      }
    }
  }

  const ranked = rankOffers(dedupe(offers), opts.maxPriceUsd).slice(0, limit);
  return {
    offers: ranked,
    rawStatus,
    error: ranked.length ? undefined : errors[0],
    sources,
  };
}
