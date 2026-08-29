import { NextResponse } from "next/server";
import { challenge } from "@/lib/x402";
export function GET() {
  return NextResponse.json({
    name: "Clearlot",
    resource: "https://clearlot-hardware-hq.vercel.app/mcp",
    type: "mcp",
    description: "Hardware and MRO live quotes. Merchant checkout. No inventory custody.",
    x402: challenge(),
    tools: ["post_intent", "search_supply", "get_quote", "open_checkout", "open_pool"],
    paid_tool: "get_quote",
    price_usd: "0.05",
    network: "base",
    asset: "USDC",
  });
}
