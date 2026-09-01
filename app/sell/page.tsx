"use client";
import { useEffect, useState } from "react";

type DemandRow = {
  spec_hash?: string;
  intent_count?: number;
  offer_count?: number;
  search_count?: number;
  miss_count?: number;
};

function isNoise(hash: string) {
  const h = (hash || "").toLowerCase();
  if (!h) return true;
  return /uncontracted|watch pn|phase0|unique miss|\btest\b/.test(h);
}

async function mcp(name: string, args: object) {
  const res = await fetch("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const json = await res.json();
  return { http: res.status, json };
}

function parseTool(json: any) {
  return json?.result?.structuredContent || null;
}

export default function SellPage() {
  const [spec, setSpec] = useState("Raspberry Pi 5 kit");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("US");
  const [lead, setLead] = useState("3");
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [out, setOut] = useState("Open specs load from the tape. You keep checkout.");
  const [busy, setBusy] = useState(false);

  async function loadDemand() {
    const { json } = await mcp("list_demand", { limit: 30 });
    const data = parseTool(json);
    const hashes: DemandRow[] = data?.hashes || [];
    setRows(hashes.filter((r) => !isNoise(String(r.spec_hash || ""))));
  }

  useEffect(() => {
    loadDemand().catch(() => setOut("Tape unreachable. You can still post an offer."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const merchant_url = url.trim();
    if (!spec.trim() || !merchant_url || !price.trim()) {
      setOut("Need a spec, a price, and your checkout or quote URL.");
      return;
    }
    if (!/^https?:\/\//i.test(merchant_url)) {
      setOut("Checkout link must start with http:// or https://. We do not take the order.");
      return;
    }
    setBusy(true);
    try {
      const { json } = await mcp("post_offer", {
        spec: spec.trim(),
        unit_price_usd: String(price.trim()),
        quantity: Math.max(1, Number(qty) || 1),
        merchant_url,
        ships_to_country: country.trim() || "US",
        firm: true,
        lead_days: Math.max(0, Number(lead) || 0),
        agent_id: "sell-page",
      });
      const data = parseTool(json);
      if (data?.error) {
        setOut(String(data.error));
      } else {
        setOut(
          "Posted. Offer " +
            data?.offer_id +
            ". Buyer pays you at your URL. We do not take title."
        );
        await loadDemand();
      }
    } catch (err: any) {
      setOut(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <p style={{ letterSpacing: 2, fontSize: 12, color: "#8b9098" }}>
        <a href="/" style={{ color: "#8b9098" }}>HARDWAREHQ</a>
        {" / SELL"}
      </p>
      <h1 style={{ fontSize: 36, margin: "8px 0" }}>Post an offer</h1>
      <p style={{ color: "#b4b8bf", lineHeight: 1.55 }}>
        A buyer asked for a part. If you have it, put your price and the page they pay on.
        They check out with you. We never hold the part or the money.
      </p>

      <section style={{ margin: "28px 0 20px" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Open specs</h2>
        {rows.length === 0 ? (
          <p style={{ color: "#8b9098", fontSize: 14 }}>No clean unmatched rows right now. You can still post any spec you stock.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rows.map((r) => (
              <li key={String(r.spec_hash)} style={{ border: "1px solid #2a313a", padding: "10px 12px", marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setSpec(String(r.spec_hash))}
                  style={{ background: "none", border: 0, color: "#e8eaed", padding: 0, font: "inherit", cursor: "pointer", textAlign: "left" }}
                >
                  <strong>{r.spec_hash}</strong>
                  <span style={{ color: "#8b9098", display: "block", fontSize: 12, marginTop: 4 }}>
                    asks {r.intent_count || 0} · offers {r.offer_count || 0} · searches {r.search_count || 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 13, color: "#8b9098" }}>
          Part number / spec
          <input value={spec} onChange={(e) => setSpec(e.target.value)} required style={inputStyle} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 13, color: "#8b9098" }}>
            Your price (USD)
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.50" required style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#8b9098" }}>
            Qty you will sell
            <input value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#8b9098" }}>
            Lead days
            <input value={lead} onChange={(e) => setLead(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <label style={{ fontSize: 13, color: "#8b9098" }}>
          Checkout or quote URL (yours)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com/quote" required style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, color: "#8b9098" }}>
          Ships to
          <input value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, width: 96 }} />
        </label>
        <button type="submit" disabled={busy} style={{ padding: "12px 16px", background: "#e8eaed", color: "#0b0d10", border: 0, fontWeight: 600, cursor: "pointer" }}>
          {busy ? "Posting…" : "Post offer"}
        </button>
      </form>
      <pre style={{ marginTop: 20, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12, whiteSpace: "pre-wrap" }}>{out}</pre>
      <p style={{ color: "#8b9098", fontSize: 13 }}>
        Agents can also call <code>post_offer</code> on <a href="/mcp" style={{ color: "#b4b8bf" }}>/mcp</a>.
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 6,
  background: "#14181e",
  color: "#e8eaed",
  border: "1px solid #2a313a",
  padding: "10px 12px",
};
