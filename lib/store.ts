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
  source?: string;
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

export type SearchEvent = {
  search_id: string;
  spec: string;
  spec_hash: string;
  quantity: number;
  ship_to_country: string;
  source: string;
  catalog_hits: number;
  vendor_hits: number;
  miss: boolean;
  intent_id?: string;
  created_at: string;
};

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://popular-grub-229280.upstash.io";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "gQAAAAAAA3-gAQIgcDJhY2IyMGQ3NTk4MGM0MzRhYjkyZWQwNjY1NDk2NTFjZg";

const mem = {
  intents: new Map<string, Intent>(),
  quotes: new Map<string, Quote>(),
  pools: new Map<string, Pool>(),
  posted: new Map<string, PostedOffer>(),
  covers: new Map<string, Cover>(),
  searches: new Map<string, SearchEvent>(),
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

export async function recordSearch(input: {
  spec: string;
  spec_hash: string;
  quantity?: number;
  ship_to_country?: string;
  source: string;
  catalog_hits: number;
  vendor_hits: number;
}) {
  const miss = input.catalog_hits + input.vendor_hits === 0;
  const rec: SearchEvent = {
    search_id: id("s"),
    spec: input.spec,
    spec_hash: input.spec_hash,
    quantity: Number(input.quantity || 1),
    ship_to_country: String(input.ship_to_country || "US"),
    source: input.source,
    catalog_hits: input.catalog_hits,
    vendor_hits: input.vendor_hits,
    miss,
    created_at: new Date().toISOString(),
  };
  mem.searches.set(rec.search_id, rec);
  await redis(["SET", `search:${rec.search_id}`, JSON.stringify(rec), "EX", "2592000"]);
  await redis(["SADD", "searches", rec.search_id]);
  await redis(["INCR", "search_count"]);
  await redis(["INCR", `searchhash:${rec.spec_hash}`]);
  await redis(["SADD", "hashes", rec.spec_hash]);
  if (miss) {
    await redis(["INCR", "miss_count"]);
    await redis(["INCR", `misshash:${rec.spec_hash}`]);
    const existing = await redis(["GET", `missintent:${rec.spec_hash}`]);
    if (!existing) {
      const intent: Intent = {
        intent_id: id("i"),
        spec: rec.spec,
        quantity: rec.quantity,
        max_price_usd: "0",
        ship_to_country: rec.ship_to_country,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        spec_hash: rec.spec_hash,
        vertical: "search_miss",
        created_at: rec.created_at,
        source: rec.source,
      };
      await putIntent(intent);
      rec.intent_id = intent.intent_id;
      await redis(["SET", `missintent:${rec.spec_hash}`, intent.intent_id, "EX", "86400"]);
    } else {
      rec.intent_id = String(existing);
    }
  }
  return rec;
}

export async function listDemand(limit = 20) {
  const hashes = ((await redis(["SMEMBERS", "hashes"])) as string[] | null) || [];
  const rows = [];
  for (const spec_hash of hashes.slice(0, 400)) {
    const intents = Number(await redis(["SCARD", `hash:${spec_hash}`])) || 0;
    const offers = Number(await redis(["SCARD", `offerhash:${spec_hash}`])) || 0;
    const searches = Number(await redis(["GET", `searchhash:${spec_hash}`])) || 0;
    const misses = Number(await redis(["GET", `misshash:${spec_hash}`])) || 0;
    if (intents + offers + searches === 0) continue;
    rows.push({ spec_hash, intent_count: intents, offer_count: offers, search_count: searches, miss_count: misses });
  }
  return rows.sort((a, b) => b.search_count + b.intent_count + b.offer_count - (a.search_count + a.intent_count + a.offer_count)).slice(0, limit);
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
  const s = await redis(["GET", "search_count"]);
  const m = await redis(["GET", "miss_count"]);
  return {
    persist: Boolean(URL && TOKEN),
    intent_count: typeof n === "number" ? n : mem.intents.size,
    offer_count: typeof o === "number" ? o : mem.posted.size,
    search_count: Number(s || 0),
    miss_count: Number(m || 0),
    quote_mem: mem.quotes.size,
  };
}

export const db = { intents: mem.intents, quotes: mem.quotes, pools: mem.pools, posted: mem.posted, covers: mem.covers, searches: mem.searches };
