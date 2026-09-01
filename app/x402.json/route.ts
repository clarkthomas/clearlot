import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    name: "Clearlot",
    resource: "https://clearlot-hardware-hq.vercel.app/mcp",
    type: "mcp",
    description: "Specified RFQ tape. Free search and quote. Missed specs stay. Merchant checkout. No inventory. No custody.",
    tools: ["post_intent", "post_offer", "list_demand", "cover_intent", "search_supply", "get_quote", "open_checkout", "open_pool"],
    paid_tool: null,
    price_usd: "0",
    network: "base",
    note: "get_quote and search_supply are free. Every query writes to the demand tape.",
  });
}
