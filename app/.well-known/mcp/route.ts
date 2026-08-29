import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json(
    { name: "Clearlot", description: "HardwareHQ intent tape. Live hardware/MRO quotes. Merchant checkout. No custody.", endpoint: "https://clearlot-hardware-hq.vercel.app/mcp", transport: "streamable-http", protocolVersion: "2025-06-18" },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300", "X-Robots-Tag": "all" } }
  );
}
