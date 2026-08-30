const PAY_TO = process.env.X402_PAY_TO || "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const QUOTE_USD = process.env.QUOTE_PRICE_USD || "0.04";
const NETWORK = process.env.X402_NETWORK || "base";
const NETWORK_CAIP = process.env.X402_NETWORK_CAIP || "eip155:8453";
const FACILITATOR = (process.env.X402_FACILITATOR_URL || "https://facilitator.payai.network").replace(/\/$/, "");
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RESOURCE = "https://clearlot-hardware-hq.vercel.app/mcp";
const ATOMIC = String(Math.round(Number(QUOTE_USD) * 1e6));

const bazaarInfo = {
  input: {
    type: "mcp",
    toolName: "get_quote",
    description: "Live hardware/MRO quote. Returns merchant offers. Does not place orders.",
    transport: "streamable-http",
    inputSchema: { type: "object", properties: { spec: { type: "string" }, intent_id: { type: "string" }, ship_to_country: { type: "string" }, quantity: { type: "integer" } } },
  },
  output: { type: "json", example: { quote_id: "q_x", offers: [{ merchant_domain: "example.com", unit_price_usd: "12.40" }] } },
};

function requirement(network: string) {
  return {
    scheme: "exact",
    network,
    amount: ATOMIC,
    maxAmountRequired: ATOMIC,
    resource: RESOURCE,
    description: "Clearlot live hardware/MRO quote",
    mimeType: "application/json",
    payTo: PAY_TO,
    asset: USDC_BASE,
    maxTimeoutSeconds: 300,
    extra: { name: "USD Coin", version: "2", quote_price_usd: QUOTE_USD },
    outputSchema: bazaarInfo,
  };
}

export function requirements() {
  return requirement(NETWORK);
}

export function challenge() {
  return {
    x402Version: 2,
    error: "Payment Required",
    accepts: [requirement(NETWORK_CAIP), requirement(NETWORK)],
    resource: { url: RESOURCE, description: "Clearlot live hardware/MRO quotes", mimeType: "application/json", serviceName: "Clearlot", tags: ["hardware", "mro", "mcp", "quotes"] },
    extensions: { bazaar: { info: bazaarInfo } },
  };
}

export function paymentHeaderFrom(req: { headers: { get(n: string): string | null } }) {
  return req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature") || req.headers.get("X-PAYMENT") || req.headers.get("x-payment") || "";
}

async function postFacilitator(path: string, body: unknown) {
  const res = await fetch(`${FACILITATOR}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

export async function settlePayment(header: string) {
  if (!header) return { settled: false, reason: "missing_payment_header" };
  let payload: any = header;
  try {
    if (header.startsWith("{")) payload = JSON.parse(header);
    else {
      const decoded = Buffer.from(header, "base64").toString("utf8");
      if (decoded.startsWith("{")) payload = JSON.parse(decoded);
    }
  } catch { payload = header; }
  const reqs = requirements();
  const bodyA = { x402Version: 1, paymentHeader: header, paymentPayload: payload, paymentRequirements: reqs };
  const bodyB = { x402Version: 2, paymentHeader: header, paymentPayload: payload, paymentRequirements: requirement(NETWORK_CAIP) };
  let verify = await postFacilitator("/verify", bodyA);
  if (verify.json?.isValid === false || (!verify.ok && verify.status >= 400)) {
    const v2 = await postFacilitator("/verify", bodyB);
    if (v2.json?.isValid !== false) verify = v2;
  }
  if (verify.json?.isValid === false) {
    return { settled: false, reason: verify.json.invalidReason || verify.json.invalidMessage || "verify_failed", verify: verify.json, facilitator: FACILITATOR };
  }
  let settle = await postFacilitator("/settle", bodyA);
  if (!(settle.json?.success || settle.json?.transaction || settle.json?.isValid)) {
    const s2 = await postFacilitator("/settle", bodyB);
    if (s2.json?.success || s2.json?.transaction || s2.json?.isValid) settle = s2;
  }
  return { settled: Boolean(settle.json?.success || settle.json?.transaction || settle.json?.isValid), verify: verify.json, settle: settle.json, facilitator: FACILITATOR };
}
