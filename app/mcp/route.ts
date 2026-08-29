import { NextRequest, NextResponse } from "next/server";
import { TOOLS } from "@/lib/tools";
import { db, hashSpec, id } from "@/lib/store";
import { searchCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const QUOTE_USD = process.env.QUOTE_PRICE_USD || "0.05";
const PAY_TO = process.env.X402_PAY_TO || "";
const QUOTE_OPEN = process.env.QUOTE_OPEN === "1";
const NETWORK = process.env.X402_NETWORK || "base";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function paid(req: NextRequest) {
  if (QUOTE_OPEN) return true;
  const sig = req.headers.get("payment-signature") || req.headers.get("x-payment");
  return Boolean(sig);
}

async function callTool(name: string, args: any, req: NextRequest) {
  if (name === "post_intent") {
    const spec = String(args.spec || "");
    const intent_id = id("i");
    const spec_hash = hashSpec(spec, args.mpn);
    const rec = {
      intent_id,
      spec,
      mpn: args.mpn,
      quantity: Number(args.quantity || 1),
      max_price_usd: String(args.max_price_usd || "0"),
      ship_to_country: String(args.ship_to_country || "US"),
      deadline: String(args.deadline || new Date(Date.now() + 86400000).toISOString()),
      spec_hash,
      created_at: new Date().toISOString(),
    };
    db.intents.set(intent_id, rec);
    return { intent_id, spec_hash, expires_at: rec.deadline };
  }

  if (name === "search_supply") {
    const query = String(args.query || "");
    const country = String(args.ship_to_country || "US");
    const { offers, error } = await searchCatalog(query, country);
    return {
      priced: false,
      error: error || null,
      results: offers.slice(0, Number(args.limit || 5)).map((o) => ({
        title: o.title,
        merchant_domain: o.merchant_domain,
        price_usd: o.unit_price_usd,
        available: o.quantity_available !== 0,
        product_url: o.product_url,
      })),
    };
  }

  if (name === "get_quote") {
    if (!paid(req)) {
      const err: any = new Error("Payment Required");
      err.http = 402;
      err.body = {
        error: "Payment Required",
        accepts: [{ scheme: "exact", network: NETWORK, maxAmountRequired: String(Math.round(Number(QUOTE_USD) * 1e6)), asset: "USDC", payTo: PAY_TO || "set X402_PAY_TO", extra: { quote_price_usd: QUOTE_USD } }],
      };
      throw err;
    }
    let spec = String(args.spec || "");
    let country = String(args.ship_to_country || "US");
    if (args.intent_id && db.intents.get(args.intent_id)) {
      const it = db.intents.get(args.intent_id)!;
      spec = spec || it.spec;
      country = it.ship_to_country;
    }
    if (!spec) return { error: "spec or intent_id required" };
    const { offers, error } = await searchCatalog(spec, country);
    const quote_id = id("q");
    const expires_at = new Date(Date.now() + Number(process.env.QUOTE_TTL_SECONDS || 1800) * 1000).toISOString();
    db.quotes.set(quote_id, { quote_id, intent_id: args.intent_id, expires_at, paid: true, offers });
    return { quote_id, expires_at, catalog_error: error || null, offers };
  }

  if (name === "open_checkout") {
    const q = db.quotes.get(String(args.quote_id));
    if (!q) return { error: "unknown quote" };
    if (new Date(q.expires_at).getTime() < Date.now()) return { error: "quote expired" };
    const offer = q.offers[Number(args.offer_index || 0)];
    if (!offer) return { error: "no offer" };
    return { checkout_url: offer.checkout_url || offer.product_url, merchant_domain: offer.merchant_domain };
  }

  if (name === "open_pool") {
    const it = db.intents.get(String(args.intent_id));
    if (!it) return { error: "unknown intent" };
    const min_quantity = Number(args.min_quantity || 2);
    let pool = [...db.pools.values()].find((p) => p.spec_hash === it.spec_hash);
    if (!pool) {
      pool = { pool_id: id("p"), spec_hash: it.spec_hash, min_quantity, intent_ids: [] };
      db.pools.set(pool.pool_id, pool);
    }
    if (!pool.intent_ids.includes(it.intent_id)) pool.intent_ids.push(it.intent_id);
    const committed_qty = pool.intent_ids.reduce((n, iid) => n + (db.intents.get(iid)?.quantity || 0), 0);
    const met = committed_qty >= pool.min_quantity;
    return { pool_id: pool.pool_id, spec_hash: pool.spec_hash, committed_qty, min_quantity: pool.min_quantity, status: met ? "threshold_met" : "open", signal: met ? "threshold_met" : "threshold_not_met", merchant_hint: null };
  }

  return { error: `unknown tool ${name}` };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ jsonrpc: "2.0", error: { message: "invalid json" } }, 400);
  if (body.method === "tools/list" || body.method === "initialize") {
    return json({
      jsonrpc: "2.0",
      id: body.id ?? 1,
      result: body.method === "initialize"
        ? { protocolVersion: "2025-03-26", serverInfo: { name: "clearlot", version: "0.1.0" }, capabilities: { tools: {} } }
        : { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) },
    });
  }
  if (body.method === "tools/call") {
    try {
      const result = await callTool(body.params?.name, body.params?.arguments || {}, req);
      return json({ jsonrpc: "2.0", id: body.id ?? 1, result });
    } catch (e: any) {
      if (e.http === 402) return json({ jsonrpc: "2.0", id: body.id ?? 1, error: e.body }, 402);
      return json({ jsonrpc: "2.0", id: body.id ?? 1, error: { message: String(e) } }, 500);
    }
  }
  return json({ jsonrpc: "2.0", id: body.id ?? 1, error: { message: "unknown method" } }, 400);
}

export async function GET() {
  return json({ name: "clearlot", tools: TOOLS.map((t) => t.name) });
}
