const PAY_TO = process.env.X402_PAY_TO || "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const QUOTE_USD = process.env.QUOTE_PRICE_USD || "0.04";
const NETWORK = process.env.X402_NETWORK || "base";
const NETWORK_CAIP = process.env.X402_NETWORK_CAIP || "eip155:8453";
const FACILITATOR = (process.env.X402_FACILITATOR_URL || "https://facilitator.payai.network").replace(/\/$/, "");
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RESOURCE = "https://clearlot-hardware-hq.vercel.app/mcp";
const ATOMIC = String(Math.round(Number(QUOTE_USD) * 1e6));

const httpBodyExample = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "get_quote",
    arguments: { spec: "raspberry pi 5 kit", ship_to_country: "US", quantity: 1 },
  },
};

const quoteExample = {
  quote_id: "q_x",
  offers: [{ merchant_domain: "example.com", unit_price_usd: "12.40" }],
};

const bazaarInfo = {
  input: {
    type: "http",
    method: "POST",
    bodyType: "json",
    body: httpBodyExample,
  },
  output: {
    type: "json",
    example: quoteExample,
  },
};

const bazaarSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    input: {
      type: "object",
      properties: {
        type: { type: "string", const: "http" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] },
        bodyType: { type: "string", enum: ["json", "form-data", "text"] },
        body: { type: "object" },
        queryParams: { type: "object" },
        headerFields: { type: "object" },
      },
      required: ["type", "method"],
    },
    output: {
      type: "object",
      properties: {
        type: { type: "string" },
        example: { type: "object" },
      },
      required: ["type"],
    },
  },
  required: ["input"],
};

export const bazaarExtension = { info: bazaarInfo, schema: bazaarSchema };

const resourceInfo = {
  url: RESOURCE,
  description: "Clearlot live hardware/MRO quotes via get_quote",
  mimeType: "application/json",
  serviceName: "Clearlot",
  tags: ["hardware", "mro", "mcp", "quotes"],
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
    extra: { name: "USD Coin", version: "2" },
    outputSchema: {
      input: {
        type: "http",
        method: "POST",
        discoverable: true,
        bodyType: "json",
        description: "Clearlot get_quote over MCP JSON-RPC",
      },
      output: { type: "json", example: quoteExample },
    },
  };
}

export function requirements() {
  return requirement(NETWORK);
}

export function challenge() {
  return {
    x402Version: 2,
    error: "Payment Required",
    accepts: [requirement(NETWORK), requirement(NETWORK_CAIP)],
    resource: resourceInfo,
    extensions: { bazaar: bazaarExtension },
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
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  return { ok: res.ok, status: res.status, json, headers };
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

function resourceUrl(value: unknown) {
  if (typeof value === "string" && value.startsWith("http")) return value;
  if (value && typeof value === "object" && typeof (value as any).url === "string") return (value as any).url;
  return RESOURCE;
}

function withBazaar(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  return {
    ...payload,
    x402Version: payload.x402Version || 2,
    resource: resourceUrl(payload.resource),
    extensions: { bazaar: bazaarExtension },
  };
}

function extHeader(h: Record<string, string> | undefined) {
  if (!h) return "";
  return h["extension-responses"] || h["extension-response"] || h["x-extension-responses"] || "";
}

export async function settlePayment(header: string) {
  if (!header) return { settled: false, reason: "missing_payment_header" };
  const decoded = decodeHeader(header);
  const raw = asPaymentPayload(decoded);
  const paymentPayload = withBazaar(raw);
  const accepted =
    paymentPayload?.accepted && paymentPayload.accepted.payTo
      ? { ...paymentPayload.accepted, resource: resourceUrl(paymentPayload.accepted.resource), outputSchema: requirement(NETWORK).outputSchema }
      : requirement(typeof paymentPayload?.network === "string" ? paymentPayload.network : NETWORK);
  const attempts = [
    { x402Version: 1, paymentPayload: { ...paymentPayload, x402Version: 1, network: NETWORK, resource: RESOURCE }, paymentRequirements: requirement(NETWORK) },
    { x402Version: 2, paymentPayload, paymentRequirements: requirement(NETWORK_CAIP) },
    { x402Version: 2, paymentPayload, paymentRequirements: requirement(NETWORK) },
    { x402Version: 2, paymentPayload, paymentRequirements: accepted },
  ];
  const verifyTries: any[] = [];
  let chosen: any = null;
  let verify: any = null;
  for (const body of attempts) {
    const v = await postFacilitator("/verify", body);
    verifyTries.push({
      version: body.x402Version,
      network: body.paymentRequirements?.network,
      status: v.status,
      json: v.json,
      ext: extHeader(v.headers),
      headerKeys: Object.keys(v.headers || {}),
    });
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
    extensionResponses: extHeader(settle.headers) || extHeader(verify.headers),
    facilitator: FACILITATOR,
    verifyTries,
  };
}
