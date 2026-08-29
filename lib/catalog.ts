import type { Offer } from "./store";

const GLOBAL = "https://catalog.shopify.com/api/ucp/mcp";

function profileUrl() {
  return process.env.AGENT_PROFILE_URL || "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json";
}

async function rpc(url: string, name: string, args: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

function minorToUsd(v: unknown): string {
  if (typeof v === "number") return (v / 100).toFixed(2);
  if (typeof v === "string" && /^\d+$/.test(v)) return (Number(v) / 100).toFixed(2);
  if (typeof v === "string") return v.replace(/^\$/, "");
  return "";
}

function asOffers(payload: unknown, country: string): Offer[] {
  let parsed: any = payload;
  try {
    if (payload && typeof payload === "object" && "result" in (payload as object)) {
      const r = (payload as any).result;
      if (typeof r?.content?.[0]?.text === "string") parsed = JSON.parse(r.content[0].text);
      else parsed = r;
    }
  } catch {
    parsed = payload;
  }
  const products = parsed?.products || parsed?.catalog?.products || parsed?.items || parsed?.results || [];
  const list = Array.isArray(products) ? products : [];
  return list.slice(0, 8).map((p: any, i: number) => {
    const url = p.url || p.product_url || p.online_store_url || p.link || "";
    const price = minorToUsd(p.price) || minorToUsd(p.price_min) || minorToUsd(p?.price?.amount) || minorToUsd(p?.variants?.[0]?.price) || "";
    let domain = "";
    try {
      domain = url ? new URL(url).hostname : p.shop || p.merchant || "";
    } catch {
      domain = p.shop || "";
    }
    return {
      rank: i + 1,
      merchant_domain: domain,
      title: p.title || p.name || "Untitled",
      unit_price_usd: price || "n/a",
      quantity_available: p.available === false ? 0 : p.quantity ?? null,
      ships_to: country,
      product_url: url,
      checkout_url: url,
      confidence: url ? 0.7 : 0.3,
    };
  });
}

export async function searchCatalog(query: string, country: string): Promise<{ offers: Offer[]; rawStatus: number; error?: string }> {
  const args = {
    meta: { "ucp-agent": { profile: profileUrl() } },
    catalog: {
      query,
      context: { intent: "procurement", country },
      filters: { ships_to: { country }, available: true },
      pagination: { limit: 8 },
    },
  };
  try {
    const { status, json } = await rpc(GLOBAL, "search_catalog", args);
    if (json?.error) {
      return { offers: [], rawStatus: status, error: JSON.stringify(json.error).slice(0, 400) };
    }
    return { offers: asOffers(json, country), rawStatus: status };
  } catch (e) {
    return { offers: [], rawStatus: 0, error: String(e) };
  }
}
