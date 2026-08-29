type Intent = {
  intent_id: string;
  spec: string;
  mpn?: string;
  quantity: number;
  max_price_usd: string;
  ship_to_country: string;
  deadline: string;
  spec_hash: string;
  created_at: string;
};

type Offer = {
  rank: number;
  merchant_domain: string;
  title: string;
  unit_price_usd: string;
  quantity_available: number | null;
  ships_to: string;
  product_url: string;
  checkout_url: string;
  confidence: number;
};

type Quote = {
  quote_id: string;
  intent_id?: string;
  expires_at: string;
  paid: boolean;
  offers: Offer[];
};

type Pool = {
  pool_id: string;
  spec_hash: string;
  min_quantity: number;
  intent_ids: string[];
};

const g = globalThis as unknown as {
  __clearlot?: { intents: Map<string, Intent>; quotes: Map<string, Quote>; pools: Map<string, Pool> };
};

if (!g.__clearlot) {
  g.__clearlot = { intents: new Map(), quotes: new Map(), pools: new Map() };
}

export const db = g.__clearlot;

export function hashSpec(spec: string, mpn?: string) {
  const s = (mpn || spec).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return s.slice(0, 80);
}

export function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export type { Intent, Offer, Quote, Pool };
