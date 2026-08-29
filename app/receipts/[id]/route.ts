import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = db.quotes.get(id);
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    quote_id: q.quote_id,
    expires_at: q.expires_at,
    offer_count: q.offers.length,
    merchants: q.offers.map((o) => o.merchant_domain),
  });
}
