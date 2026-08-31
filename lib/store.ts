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

export type PostedOffer = {
  offer_id: string;
  spec: string;
  mpn?: string;
  spec_hash: string;
  vertical: string;
  unit_price_usd: string;
  quantity: number;
  ships_to_country: string;
  merchant_url: string;
  merchant_domain: string;
  agent_id?: string;
  firm: boolean;
  lead_days: number;
  expires_at: string;
  created_at: string;
};

export type Cover = {
  cover_id: string;
  intent_id: string;
  offer_id: string;
  spec_hash: string;
  created_at: string;
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
  posted: new Map<string, PostedOffer>(),
  covers: new Map<string, Cover>(),
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

function parse<T>(raw: unknown): T | undefined {
  if (!raw) return undefined;
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
}

export async function putIntent(rec: Intent) {
  mem.intents.set(rec.intent_id, rec);
  await redis(["SET", `intent:${rec.intent_id}`, JSON.stringify(rec)]);
  await redis(["SADD", "intents", rec.intent_id]);
  await redis(["SADD", `hash:${rec.spec_hash}`, rec.intent_id]);
  await redis(["SADD", "hashes", rec.spec_hash]);
}

export async function getIntent(intent_id: string) {
  const local = mem.intents.get(intent_id);
  if (local) return local;
  const rec = parse<Intent>(await redis(["GET", `intent:${intent_id}`]));
  if (!rec) return undefined;
  mem.intents.set(intent_id, rec);
  return rec;
}

export async function putPostedOffer(rec: PostedOffer) {
  mem.posted.set(rec.offer_id, rec);
  await redis(["SET", `offer:${rec.offer_id}`, JSON.stringify(rec)]);
  await redis(["SADD", "offers", rec.offer_id]);
  await redis(["SADD", `offerhash:${rec.spec_hash}`, rec.offer_id]);
  await redis(["SADD", "hashes", rec.spec_hash]);
}

export async function getPostedOffer(offer_id: string) {
  const local = mem.posted.get(offer_id);
  if (local) return local;
  const rec = parse<PostedOffer>(await redis(["GET", `offer:${offer_id}`]));
  if (!rec) return undefined;
  mem.posted.set(offer_id, rec);
  return rec;
}

export async function listPostedOffers(spec_hash: string, limit = 10) {
  const ids = ((await redis(["SMEMBERS", `offerhash:${spec_hash}`])) as string[] | null) || [];
  const out: PostedOffer[] = [];
  for (const oid of ids.slice(0, limit)) {
    const rec = await getPostedOffer(oid);
    if (rec && new Date(rec.expires_at).getTime() > Date.now()) out.push(rec);
  }
  return out.sort((a, b) => Number(a.unit_price_usd) - Number(b.unit_price_usd));
}

export async function putCover(rec: Cover) {
  mem.covers.set(rec.cover_id, rec);
  await redis(["SET", `cover:${rec.cover_id}`, JSON.stringify(rec)]);
  await redis(["SADD", `covers:${rec.intent_id}`, rec.cover_id]);
}

export async function listDemand(limit = 20) {
  const hashes = ((await redis(["SMEMBERS", "hashes"])) as string[] | null) || [];
  const rows = [];
  for (const spec_hash of hashes.slice(0, 200)) {
    const intents = Number(await redis(["SCARD", `hash:${spec_hash}`])) || 0;
    const offers = Number(await redis(["SCARD", `offerhash:${spec_hash}`])) || 0;
    if (intents + offers === 0) continue;
    rows.push({ spec_hash, intent_count: intents, offer_count: offers });
  }
  return rows.sort((a, b) => b.intent_count + b.offer_count - (a.intent_count + a.offer_count)).slice(0, limit);
}

export async function putQuote(rec: Quote) {
  mem.quotes.set(rec.quote_id, rec);
  const ttl = Math.max(60, Math.floor((new Date(rec.expires_at).getTime() - Date.now()) / 1000));
  await redis(["SET", `quote:${rec.quote_id}`, JSON.stringify(rec), "EX", String(ttl + 3600)]);
}

export async function getQuote(quote_id: string) {
  const local = mem.quotes.get(quote_id);
  if (local) return local;
  const rec = parse<Quote>(await redis(["GET", `quote:${quote_id}`]));
  if (!rec) return undefined;
  mem.quotes.set(quote_id, rec);
  return rec;
}

export async function upsertPool(spec_hash: string, intent_id: string, min_quantity: number, vertical = "hardware") {
  let pool: Pool | undefined;
  const raw = await redis(["GET", `pool:${spec_hash}`]);
  if (raw) pool = parse<Pool>(raw);
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
  const o = await redis(["SCARD", "offers"]);
  return {
    persist: Boolean(URL && TOKEN),
    intent_count: typeof n === "number" ? n : mem.intents.size,
    offer_count: typeof o === "number" ? o : mem.posted.size,
    quote_mem: mem.quotes.size,
  };
}

export const db = { intents: mem.intents, quotes: mem.quotes, pools: mem.pools, posted: mem.posted, covers: mem.covers };
