export const TOOLS = [
  {
    name: "post_intent",
    description: "Record a buy intent. Free. Does not charge or hold funds.",
    inputSchema: {
      type: "object",
      required: ["spec", "quantity", "max_price_usd", "ship_to_country", "deadline"],
      properties: {
        spec: { type: "string" },
        mpn: { type: "string" },
        quantity: { type: "integer", minimum: 1 },
        max_price_usd: { type: "string" },
        ship_to_country: { type: "string" },
        deadline: { type: "string" },
        agent_id: { type: "string" },
        vertical: { type: "string" },
      },
    },
  },
  {
    name: "post_offer",
    description: "Record a vendor ask against a spec hash. Free. No inventory held here. Merchant stays merchant of record.",
    inputSchema: {
      type: "object",
      required: ["spec", "unit_price_usd", "quantity", "merchant_url", "ships_to_country"],
      properties: {
        spec: { type: "string" },
        mpn: { type: "string" },
        unit_price_usd: { type: "string" },
        quantity: { type: "integer", minimum: 1 },
        merchant_url: { type: "string" },
        merchant_domain: { type: "string" },
        ships_to_country: { type: "string" },
        firm: { type: "boolean" },
        lead_days: { type: "integer" },
        expires_at: { type: "string" },
        agent_id: { type: "string" },
        vertical: { type: "string" },
      },
    },
  },
  {
    name: "list_demand",
    description: "Read clustered hashes with intent, offer, search, and miss counts. Signal only. Not a fill.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        spec_hash: { type: "string" },
      },
    },
  },
  {
    name: "cover_intent",
    description: "Attach a posted offer to a buy intent. No deposits. No order placement.",
    inputSchema: {
      type: "object",
      required: ["intent_id", "offer_id"],
      properties: {
        intent_id: { type: "string" },
        offer_id: { type: "string" },
      },
    },
  },
  {
    name: "search_supply",
    description: "Free supply scan. Every query is written to the demand tape. Misses become implicit intents.",
    inputSchema: {
      type: "object",
      required: ["query", "ship_to_country"],
      properties: {
        query: { type: "string" },
        ship_to_country: { type: "string" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_quote",
    description: "Free live quote. Mixes vendor offers and catalog. Every spec is written to the demand tape. Does not place orders.",
    inputSchema: {
      type: "object",
      properties: {
        intent_id: { type: "string" },
        spec: { type: "string" },
        mpn: { type: "string" },
        quantity: { type: "integer" },
        max_price_usd: { type: "string" },
        ship_to_country: { type: "string" },
        deadline: { type: "string" },
      },
    },
  },
  {
    name: "open_checkout",
    description: "Return merchant product/checkout URL for a quote. Does not complete payment.",
    inputSchema: {
      type: "object",
      required: ["quote_id"],
      properties: {
        quote_id: { type: "string" },
        offer_index: { type: "integer" },
      },
    },
  },
  {
    name: "open_pool",
    description: "Cluster intents by spec hash. No deposits.",
    inputSchema: {
      type: "object",
      required: ["intent_id", "min_quantity"],
      properties: {
        intent_id: { type: "string" },
        min_quantity: { type: "integer", minimum: 2 },
      },
    },
  },
];
