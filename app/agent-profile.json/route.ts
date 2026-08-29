import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    name: "Clearlot",
    operator: "HardwareHQ",
    version: "0.1.0",
    ucp: { role: "shopping-consumer", capabilities: ["catalog.search", "checkout.handoff"] },
    notes: "Does not take title or merchandise funds.",
  });
}
