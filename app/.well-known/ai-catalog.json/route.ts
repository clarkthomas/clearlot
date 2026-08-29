import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    specVersion: "1.0",
    entries: [{ identifier: "urn:ai:clearlot-hardware-hq.vercel.app:mcp:clearlot", type: "application/mcp-server-card+json", url: "https://clearlot-hardware-hq.vercel.app/mcp/server-card" }],
  });
}
