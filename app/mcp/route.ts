import { NextRequest, NextResponse } from "next/server";
import { TOOLS } from "@/lib/tools";
import {
  hashSpec,
  id,
  putIntent,
  getIntent,
  putQuote,
  getQuote,
  upsertPool,
  putPostedOffer,
  getPostedOffer,
  listPostedOffers,
  putCover,
  listDemand,
} from "@/lib/store";
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
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version, PAYMENT-RESPONSE, EXTENSION-RESPONSES",
};
function mcpResult(id: unknown, result: unknown) { return { jsonrpc: "2.0", id: id ?? 1, result }; }
function mcpError(id: unknown, message: string, code = -32000) { return { jsonrpc: "2.0", id: id ?? 1, error: { code, message } }; }
function toolContent(data: unknown, isError = false) { return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError }; }

function decodeExt(raw: unknown) {
  if (!raw || typeof raw !== "string") return raw || null;
  try {
    const s = raw.includes("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(s);
  } catch {
    return raw;
  }
}

function domainOf(url: string, fallback = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

async function runTool(name: string, args: any, req: NextRequest) {
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
      vertical: String(args.vertical || "hardware"),
      created_at: new Date().toISOString(),
    };
    await putIntent(rec);
    return { intent_id, spec_hash, vertical: rec.vertical, expires_at: rec.deadline, custody: false };
  }
  if (name === "post_offer") {
    const spec = String(args.spec || "");
    const merchant_url = String(args.merchant_url || "");
    if (!spec || !merchant_url) return { error: "spec and merchant_url required" };
    const spec_hash = hashSpec(spec, args.mpn);
    const offer_id = id("o");
    const rec = {
      offer_id,
      spec,
      mpn: args.mpn,
      spec_hash,
      vertical: String(args.vertical || "hardware"),
      unit_price_usd: String(args.unit_price_usd || "0"),
      quantity: Number(args.quantity || 1),
      ships_to_country: String(args.ships_to_country || "US"),
      merchant_url,
      merchant_domain: String(args.merchant_domain || domainOf(merchant_url)),
      agent_id: args.agent_id ? String(args.agent_id) : undefined,
      firm: Boolean(args.firm),
      lead_days: Number(args.lead_days || 0),
      expires_at: String(args.expires_at || new Date(Date.now() + 7 * 86400000).toISOString()),
      created_at: new Date().toISOString(),
    };
    await putPostedOffer(rec);
    return { offer_id, spec_hash, firm: rec.firm, expires_at: rec.expires_at, custody: false, inventory: false };
  }
  if (name === "list_demand") {
    if (args.spec_hash) {
      const spec_hash = String(args.spec_hash);
      const offers = await listPostedOffers(spec_hash, 20);
      const rows = await listDemand(200);
      const row = rows.find((r) => r.spec_hash === spec_hash) || { spec_hash, intent_count: 0, offer_count: offers.length };
      return { spec_hash, intent_count: row.intent_count, offer_count: row.offer_count, offers: offers.map((o) => ({ offer_id: o.offer_id, unit_price_usd: o.unit_price_usd, quantity: o.quantity, merchant_domain: o.merchant_domain, merchant_url: o.merchant_url, firm: o.firm, lead_days: o.lead_days })), fill: false };
    }
    const hashes = await listDemand(Math.min(50, Number(args.limit || 20)));
    return { hashes, fill: false, note: "counts are signals. a paid quote is true only if checkout could have filled." };
  }
  if (name === "cover_intent") {
    const it = await getIntent(String(args.intent_id || ""));
    const off = await getPostedOffer(String(args.offer_id || ""));
    if (!it) return { error: "unknown intent" };
    if (!off) return { error: "unknown offer" };
    if (it.spec_hash !== off.spec_hash) return { error: "spec_hash mismatch" };
    const cover = {
      cover_id: id("c"),
      intent_id: it.intent_id,
      offer_id: off.offer_id,
      spec_hash: it.spec_hash,
      created_at: new Date().toISOString(),
    };
    await putCover(cover);
    return {
      cover_id: cover.cover_id,
      intent_id: it.intent_id,
      offer_id: off.offer_id,
      spec_hash: it.spec_hash,
      checkout_url: off.merchant_url,
      merchant_domain: off.merchant_domain,
      unit_price_usd: off.unit_price_usd,
      deposits: false,
      order_placed: false,
    };
  }
  if (name === "search_supply") {
    const query = String(args.query || "");
    const country = String(args.ship_to_country || "US");
    const spec_hash = hashSpec(query);
    const posted = await listPostedOffers(spec_hash, Number(args.limit || 5));
    const { offers, error } = await searchCatalog(query, country);
    const vendor = posted.map((o) => ({
      title: o.spec,
      merchant_domain: o.merchant_domain,
      price_usd: o.unit_price_usd,
      available: o.quantity > 0,
      product_url: o.merchant_url,
      source: "vendor_offer",
      firm: o.firm,
    }));
    const catalog = offers.slice(0, Number(args.limit || 5)).map((o) => ({
      title: o.title,
      merchant_domain: o.merchant_domain,
      price_usd: o.unit_price_usd,
      available: o.quantity_available !== 0,
      product_url: o.product_url,
      source: o.source || "catalog",
    }));
    return { priced: false, error: error || null, results: [...vendor, ...catalog].slice(0, Number(args.limit || 5)) };
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
        err.http = 402;
        err.body = { error: "Payment Required", reason: settled.reason, listing: decodeExt(settled.extensionResponses), settlement: settled };
        throw err;
      }
      args._settlement = {
        facilitator: settled.facilitator,
        settle: settled.settle,
        listing: decodeExt(settled.extensionResponses),
        verifyTries: settled.verifyTries || null,
      };
    }
    let spec = String(args.spec || "");
    let country = String(args.ship_to_country || "US");
    let spec_hash = hashSpec(spec, args.mpn);
    if (args.intent_id) {
      const it = await getIntent(args.intent_id);
      if (it) {
        spec = spec || it.spec;
        country = it.ship_to_country;
        spec_hash = it.spec_hash;
      }
    }
    if (!spec) return { error: "spec or intent_id required" };
    const posted = await listPostedOffers(spec_hash, 8);
    const { offers, error } = await searchCatalog(spec, country);
    const vendorOffers = posted.map((o, i) => ({
      rank: i + 1,
      merchant_domain: o.merchant_domain,
      title: o.spec,
      unit_price_usd: o.unit_price_usd,
      quantity_available: o.quantity,
      ships_to: o.ships_to_country,
      product_url: o.merchant_url,
      checkout_url: o.merchant_url,
      confidence: o.firm ? 0.8 : 0.5,
      source: "vendor_offer",
    }));
    const merged = [...vendorOffers, ...offers];
    const quote_id = id("q");
    const expires_at = new Date(Date.now() + Number(process.env.QUOTE_TTL_SECONDS || 1800) * 1000).toISOString();
    await putQuote({ quote_id, intent_id: args.intent_id, expires_at, paid: true, offers: merged });
    return { quote_id, expires_at, spec_hash, catalog_error: error || null, listing: args._settlement?.listing || null, offers: merged, settlement: args._settlement || null };
  }
  if (name === "open_checkout") {
    const q = await getQuote(String(args.quote_id));
    if (!q) return { error: "unknown quote" };
    if (new Date(q.expires_at).getTime() < Date.now()) return { error: "quote expired" };
    const offer = q.offers[Number(args.offer_index || 0)];
    if (!offer) return { error: "no offer" };
    return { checkout_url: offer.checkout_url || offer.product_url, merchant_domain: offer.merchant_domain };
  }
  if (name === "open_pool") {
    const it = await getIntent(String(args.intent_id));
    if (!it) return { error: "unknown intent" };
    const min_quantity = Number(args.min_quantity || 2);
    const pool = await upsertPool(it.spec_hash, it.intent_id, min_quantity, it.vertical || "hardware");
    let committed_qty = 0;
    for (const iid of pool.intent_ids) {
      const row = await getIntent(iid);
      committed_qty += row?.quantity || 0;
    }
    const met = committed_qty >= pool.min_quantity;
    return { pool_id: pool.pool_id, spec_hash: pool.spec_hash, vertical: pool.vertical, committed_qty, min_quantity: pool.min_quantity, status: met ? "threshold_met" : "open", signal: met ? "threshold_met" : "threshold_not_met", merchant_hint: null };
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
    return respond(req, mcpResult(rpcId, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "clearlot", version: "0.2.0", title: "Clearlot" },
      instructions: "Specified-commerce tape. Purchasing agents post_intent. Vending agents post_offer and cover_intent. list_demand is a signal. get_quote is x402 on Base USDC. Checkout is the merchant of record. No inventory. No merchandise custody.",
    }), 200, { "Mcp-Session-Id": id("sess") });
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
