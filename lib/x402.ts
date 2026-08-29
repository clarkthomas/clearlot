const PAY_TO = process.env.X402_PAY_TO || "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const QUOTE_USD = process.env.QUOTE_PRICE_USD || "0.05";
const NETWORK = process.env.X402_NETWORK || "base";
const FACILITATOR = (process.env.X402_FACILITATOR_URL || "https://facilitator.payai.network").replace(/\/$/, "");
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RESOURCE = "https://clearlot-hardware-hq.vercel.app/mcp";

export function requirements() {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: String(Math.round(Number(QUOTE_USD) * 1e6)),
    resource: RESOURCE,
    description: "Clearlot live hardware quote",
    mimeType: "application/json",
    payTo: PAY_TO,
    asset: USDC_BASE,
    maxTimeoutSeconds: 300,
    extra: { name: "USD Coin", version: "2", quote_price_usd: QUOTE_USD },
  };
}

export function challenge() {
  return { x402Version: 1, error: "Payment Required", accepts: [requirements()] };
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
  const verify = await postFacilitator("/verify", bodyA);
  if (verify.json?.isValid === false) {
    return { settled: false, reason: verify.json.invalidReason || verify.json.invalidMessage || "verify_failed", verify: verify.json, facilitator: FACILITATOR };
  }
  const settle = await postFacilitator("/settle", bodyA);
  return {
    settled: Boolean(settle.json?.success || settle.json?.transaction),
    verify: verify.json,
    settle: settle.json,
    facilitator: FACILITATOR,
  };
}
