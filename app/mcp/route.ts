import { NextRequest, NextResponse } from "next/server";
import { TOOLS } from "@/lib/tools";
import { db, hashSpec, id } from "@/lib/store";
import { searchCatalog } from "@/lib/catalog";
import { challenge, paymentHeaderFrom, settlePayment } from "@/lib/x402";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const QUOTE_OPEN = process.env.QUOTE_OPEN === "1";
const PROTOCOL = "2025-06-18";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID, payment-signature, PAYMENT-SIGNATURE, x-payment, PAYMENT-REQUIRED",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version, PAYMENT-RESPONSE",
};
function mcpResult(id: unknown, result: unknown) { return { jsonrpc: "2.0", id: id ?? 1, result }; }
function mcpError(id: unknown, message: string, code = -32000) { return { jsonrpc: "2.0", id: id ?? 1, error: { code, message } }; }
function toolContent(data: unknown, isError = false) { return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError }; }

async function runTool(name: string, args: any, req: NextRequest) {
  if (name === "post_intent") {
    const spec = String(args.spec || "");
    const intent_id = id("i");
    const spec_hash = hashSpec(spec, args.mpn);
    const rec = { intent_id, spec, mpn: args.mpn, quantity: Number(args.quantity || 1), max_price_usd: String(args.max_price_usd || "0"), ship_to_country: String(args.ship_to_country || "US"), deadline: String(args.deadline || new Date(Date.now() + 86400000).toISOString()), spec_hash, created_at: new Date().toISOString() };
    db.intents.set(intent_id, rec);
    return { intent_id, spec_hash, expires_at: rec.deadline };
  }
  if (name === "search_supply") {
    const query = String(args.query || "");
    const country = String(args.ship_to_country || "US");
    const { offers, error } = await searchCatalog(query, country);
    return { priced: false, error: error || null, results: offers.slice(0, Number(args.limit || 5)).map((o) => ({ title: o.title, merchant_domain: o.merchant_domain, price_usd: o.unit_price_usd, available: o.quantity_available !== 0, product_url: o.product_url })) };
  }
  if (name === "get_quote") {
    if (!QUOTE_OPEN) {
      const header = paymentHeaderFrom(req);
      if (!header) {
        const err: any = new Error("Payment Required");
        err.http = 402; err.body = challenge(); throw err;
      }
      const settled = await settlePayment(header);
      if (!settled.settled) {
        const err: any = new Error("Payment Required");
        err.http = 402; err.body = { ...challenge(), settlement: settled }; throw err;
      }
      args._settlement = { facilitator: settled.facilitator, settle: settled.settle };
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
    return { quote_id, expires_at, catalog_error: error || null, offers, settlement: args._settlement || null };
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
    if (!pool) { pool = { pool_id: id("p"), spec_hash: it.spec_hash, min_quantity, intent_ids: [] }; db.pools.set(pool.pool_id, pool); }
    if (!pool.intent_ids.includes(it.intent_id)) pool.intent_ids.push(it.intent_id);
    const committed_qty = pool.intent_ids.reduce((n, iid) => n + (db.intents.get(iid)?.quantity || 0), 0);
    const met = committed_qty >= pool.min_quantity;
    return { pool_id: pool.pool_id, spec_hash: pool.spec_hash, committed_qty, min_quantity: pool.min_quantity, status: met ? "threshold_met" : "open", signal: met ? "threshold_met" : "threshold_not_met", merchant_hint: null };
  }
  throw new Error(`unknown tool ${name}`);
}

function respond(req: NextRequest, payload: unknown, status = 200, extra: Record<string, string> = {}) {
  const accept = req.headers.get("accept") || "";
  const headers: Record<string, string> = { ...cors, "MCP-Protocol-Version": PROTOCOL, ...extra };
  if (status === 402) headers["PAYMENT-REQUIRED"] = Buffer.from(JSON.stringify(challenge())).toString("base64");
  if (accept.includes("text/event-stream") && !accept.includes("application/json")) {
    return new NextResponse(`event: message\ndata: ${JSON.stringify(payload)}\n\n`, { status, headers: { ...headers, "Content-Type": "text/event-stream" } });
  }
  return NextResponse.json(payload, { status, headers });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) {
    return new NextResponse(`: clearlot ready\n\n`, { status: 200, headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "MCP-Protocol-Version": PROTOCOL } });
  }
  return NextResponse.json({ name: "clearlot", transport: "streamable-http", protocolVersion: PROTOCOL, tools: TOOLS.map((t) => t.name) }, { headers: cors });
}
export async function DELETE() { return new NextResponse(null, { status: 204, headers: cors }); }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return respond(req, mcpError(null, "invalid json"), 400);
  const method = body.method as string;
  const rpcId = body.id ?? 1;
  if (method === "initialize") {
    return respond(req, mcpResult(rpcId, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "clearlot", version: "0.1.0", title: "Clearlot" }, instructions: "Hardware/MRO intent tape. post_intent and search_supply are free. get_quote is x402-gated and settled via facilitator to payTo on Base USDC. Merchant checkout. No merchandise custody." }), 200, { "Mcp-Session-Id": id("sess") });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return new NextResponse(null, { status: 202, headers: cors });
  if (method === "ping") return respond(req, mcpResult(rpcId, {}));
  if (method === "tools/list") return respond(req, mcpResult(rpcId, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) }));
  if (method === "resources/list") return respond(req, mcpResult(rpcId, { resources: [] }));
  if (method === "prompts/list") return respond(req, mcpResult(rpcId, { prompts: [] }));
  if (method === "tools/call") {
    try {
      const data = await runTool(body.params?.name, body.params?.arguments || {}, req);
      return respond(req, mcpResult(rpcId, toolContent(data)));
    } catch (e: any) {
      if (e.http === 402) return respond(req, mcpResult(rpcId, toolContent(e.body, true)), 402);
      return respond(req, mcpResult(rpcId, toolContent({ error: String(e.message || e) }, true)), 200);
    }
  }
  return respond(req, mcpError(rpcId, `unknown method ${method}`), 400);
}
