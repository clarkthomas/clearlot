import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export function GET(_: Request, { params }: { params: { id: string } }) {
  const q = db.quotes.get(params.id);
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    quote_id: q.quote_id,
    expires_at: q.expires_at,
    offer_count: q.offers.length,
    merchants: q.offers.map((o) => o.merchant_domain),
  });
}
