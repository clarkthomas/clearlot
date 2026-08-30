export type Intent = {
  intent_id: string;
  spec: string;
  mpn?: string;
  quantity: number;
  max_price_usd: string;
  ship_to_country: string;
  deadline: string;
  spec_hash: string;
  vertical: string;
  created_at: string;
};

export type Offer = {
  rank: number;
  merchant_domain: string;
  title: string;
  unit_price_usd: string;
  quantity_available: number | null;
  ships_to: string;
  product_url: string;
  checkout_url: string;
  confidence: number;
  product_id?: string;
  variant_id?: string;
  source?: string;
};

export type Quote = {
  quote_id: string;
  intent_id?: string;
  expires_at: string;
  paid: boolean;
  offers: Offer[];
};

export type Pool = {
  pool_id: string;
  spec_hash: string;
  vertical: string;
  min_quantity: number;
  intent_ids: string[];
};

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://popular-grub-229280.upstash.io";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "gQAAAAAAA3-gAQIgcDJhY2IyMGQ3NTk4MGM0MzRhYjkyZWQwNjY1NDk2NTFjZg";

const mem = {
  intents: new Map<string, Intent>(),
  quotes: new Map<string, Quote>(),
  pools: new Map<string, Pool>(),
};

async function redis(cmd: unknown[]) {
  if (!URL || !TOKEN) return null;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
  } catch {
    return null;
  }
}

export function hashSpec(spec: string, mpn?: string) {
  const s = (mpn || spec).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return s.slice(0, 80);
}

export function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export async function putIntent(rec: Intent) {
  mem.intents.set(rec.intent_id, rec);
  await redis(["SET", `intent:${rec.intent_id}`, JSON.stringify(rec)]);
  await redis(["SADD", "intents", rec.intent_id]);
  await redis(["SADD", `hash:${rec.spec_hash}`, rec.intent_id]);
}

export async function getIntent(intent_id: string) {
  const local = mem.intents.get(intent_id);
  if (local) return local;
  const raw = await redis(["GET", `intent:${intent_id}`]);
  if (!raw) return undefined;
  const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
  mem.intents.set(intent_id, rec);
  return rec as Intent;
}

export async function putQuote(rec: Quote) {
  mem.quotes.set(rec.quote_id, rec);
  const ttl = Math.max(60, Math.floor((new Date(rec.expires_at).getTime() - Date.now()) / 1000));
  await redis(["SET", `quote:${rec.quote_id}`, JSON.stringify(rec), "EX", String(ttl + 3600)]);
}

export async function getQuote(quote_id: string) {
  const local = mem.quotes.get(quote_id);
  if (local) return local;
  const raw = await redis(["GET", `quote:${quote_id}`]);
  if (!raw) return undefined;
  const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
  mem.quotes.set(quote_id, rec);
  return rec as Quote;
}

export async function upsertPool(spec_hash: string, intent_id: string, min_quantity: number, vertical = "hardware") {
  let pool: Pool | undefined;
  const raw = await redis(["GET", `pool:${spec_hash}`]);
  if (raw) pool = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!pool) pool = [...mem.pools.values()].find((p) => p.spec_hash === spec_hash);
  if (!pool) pool = { pool_id: id("p"), spec_hash, vertical, min_quantity, intent_ids: [] };
  if (!pool.intent_ids.includes(intent_id)) pool.intent_ids.push(intent_id);
  pool.min_quantity = Math.max(pool.min_quantity, min_quantity);
  mem.pools.set(pool.pool_id, pool);
  await redis(["SET", `pool:${spec_hash}`, JSON.stringify(pool)]);
  return pool;
}

export async function tapeStats() {
  const n = await redis(["SCARD", "intents"]);
  return { persist: Boolean(URL && TOKEN), intent_count: typeof n === "number" ? n : mem.intents.size, quote_mem: mem.quotes.size };
}

export const db = { intents: mem.intents, quotes: mem.quotes, pools: mem.pools };
