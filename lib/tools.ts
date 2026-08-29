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
        vertical: { type: "string", description: "hardware | marine | drone | electronics" },
      },
    },
  },
  {
    name: "search_supply",
    description: "Unpriced supply scan. Results may be stale.",
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
    description: "Live quote. Returns 402 unless x402 payment or QUOTE_OPEN=1. Does not place orders.",
    inputSchema: {
      type: "object",
      properties: {
        intent_id: { type: "string" },
        spec: { type: "string" },
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
