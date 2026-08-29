import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json(
    {
      name: "hardwarehq/clearlot",
      version: "0.1.0",
      title: "Clearlot",
      description: "Post buy intents, search Shopify Catalog supply, get paid live quotes, hand off to merchant checkout.",
      websiteUrl: "https://clearlot-hardware-hq.vercel.app",
      remotes: [{ type: "streamable-http", url: "https://clearlot-hardware-hq.vercel.app/mcp", supportedProtocolVersions: ["2025-06-18", "2025-03-26"] }],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
