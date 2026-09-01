import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json(
    {
      name: "Clearlot",
      description: "Specified RFQ tape. Free search and quote. Missed MPN, aftermarket, OEM, and second-source specs stay on the tape. Merchant checkout. No inventory. No custody.",
      endpoint: "https://clearlot-hardware-hq.vercel.app/mcp",
      transport: "streamable-http",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } }
  );
}
