import { NextResponse } from "next/server";
import { tapeStats } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  const stats = await tapeStats();
  return NextResponse.json({ ok: true, persist: stats.persist, intent_count: stats.intent_count, quote_mem: stats.quote_mem });
}
