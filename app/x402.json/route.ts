import { NextResponse } from "next/server";
import { challenge } from "@/lib/x402";
export function GET() {
  return NextResponse.json({
    name: "Clearlot",
    resource: "https://clearlot-hardware-hq.vercel.app/mcp",
    type: "mcp",
    description: "Specified-commerce tape. Live quotes. Merchant checkout. No inventory custody.",
    x402: challenge(),
    tools: ["post_intent", "post_offer", "list_demand", "cover_intent", "search_supply", "get_quote", "open_checkout", "open_pool"],
    paid_tool: "get_quote",
    price_usd: "0.04",
    network: "base",
    asset: "USDC",
  });
}
