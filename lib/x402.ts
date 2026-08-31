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
    extra: { name: "USD Coin", version: "2", assetTransferMethod: "eip3009", quote_price_usd: QUOTE_USD },
    outputSchema: bazaarInfo,
  };
}

export function requirements() {
  return requirement(NETWORK);
}

export function challenge() {
  return {
    x402Version: 1,
    error: "Payment Required",
    accepts: [requirement(NETWORK), requirement(NETWORK_CAIP)],
    resource: { url: RESOURCE, description: "Clearlot live hardware/MRO quotes", mimeType: "application/json", serviceName: "Clearlot", tags: ["hardware", "mro", "mcp", "quotes"] },
    extensions: { bazaar: { info: bazaarInfo } },
  };
}

export function paymentHeaderFrom(req: { headers: { get(n: string): string | null } }) {
  return (
    req.headers.get("PAYMENT-SIGNATURE") ||
    req.headers.get("payment-signature") ||
    req.headers.get("X-PAYMENT") ||
    req.headers.get("x-payment") ||
    ""
  );
}

async function postFacilitator(path: string, body: unknown) {
  const res = await fetch(`${FACILITATOR}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, headers: Object.fromEntries(res.headers.entries()) };
}

function decodeHeader(header: string) {
  if (!header) return header;
  try {
    if (header.trim().startsWith("{")) return JSON.parse(header);
    const decoded = Buffer.from(header, "base64").toString("utf8");
    if (decoded.startsWith("{")) return JSON.parse(decoded);
  } catch {}
  return header;
}

function asPaymentPayload(decoded: any) {
  if (!decoded || typeof decoded !== "object") return decoded;
  if (decoded.payload && decoded.scheme && decoded.network) return decoded;
  if (decoded.paymentPayload) return decoded.paymentPayload;
  return decoded;
}

export async function settlePayment(header: string) {
  if (!header) return { settled: false, reason: "missing_payment_header" };
  const decoded = decodeHeader(header);
  const paymentPayload = asPaymentPayload(decoded);
  const accepted = paymentPayload?.accepted || (typeof paymentPayload === "object" && paymentPayload.network === NETWORK_CAIP ? requirement(NETWORK_CAIP) : requirement(NETWORK));
  const attempts = [
    { x402Version: 1, paymentPayload, paymentRequirements: requirement(NETWORK), serverExtensions: { bazaar: { info: bazaarInfo } } },
    { x402Version: 1, paymentPayload, paymentRequirements: accepted },
    { x402Version: 2, paymentPayload, paymentRequirements: requirement(NETWORK_CAIP), serverExtensions: { bazaar: { info: bazaarInfo } } },
    { x402Version: 2, paymentPayload, paymentRequirements: accepted, serverExtensions: { bazaar: { info: bazaarInfo } } },
  ];
  const verifyTries: any[] = [];
  let chosen: any = null;
  let verify: any = null;
  for (const body of attempts) {
    const v = await postFacilitator("/verify", body);
    verifyTries.push({ version: body.x402Version, network: body.paymentRequirements?.network, status: v.status, json: v.json, ext: v.headers?.["extension-responses"] || v.headers?.["EXTENSION-RESPONSES"] });
    if (v.json?.isValid === true) {
      chosen = body;
      verify = v;
      break;
    }
    if (!verify) verify = v;
  }
  if (!chosen) {
    return {
      settled: false,
      reason: verify?.json?.invalidReason || verify?.json?.invalidMessage || verify?.json?.errorReason || "verify_failed",
      verify: verify?.json,
      verifyTries,
      facilitator: FACILITATOR,
    };
  }
  const settle = await postFacilitator("/settle", chosen);
  const ok = Boolean(settle.json?.success || settle.json?.transaction);
  return {
    settled: ok,
    reason: ok ? "settled" : settle.json?.errorReason || settle.json?.invalidReason || "settle_failed",
    verify: verify.json,
    settle: settle.json,
    extensionResponses: settle.headers?.["extension-responses"] || verify.headers?.["extension-responses"],
    facilitator: FACILITATOR,
    verifyTries,
  };
}
