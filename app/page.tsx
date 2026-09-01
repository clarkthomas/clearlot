"use client";
import { useEffect, useState } from "react";

const MCP = "https://clearlot-hardware-hq.vercel.app/mcp";

export default function Page() {
  const [query, setQuery] = useState("STM32F411CEU6");
  const [country, setCountry] = useState("US");
  const [out, setOut] = useState("Ready.");

  async function mcp(name: string, args: object) {
    const res = await fetch("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    const json = await res.json();
    setOut(JSON.stringify({ http: res.status, ...json }, null, 2));
    return json;
  }

  useEffect(() => {
    const ctx = (window as any).document?.modelContext;
    if (!ctx?.registerTool) return;
    for (const name of ["post_intent", "post_offer", "list_demand", "cover_intent", "search_supply", "get_quote", "open_checkout", "open_pool"]) {
      try {
        ctx.registerTool({ name, description: "Clearlot " + name, execute: async (args: object) => mcp(name, args || {}) });
      } catch {}
    }
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <p style={{ letterSpacing: 2, fontSize: 12, color: "#8b9098" }}>HARDWAREHQ</p>
      <h1 style={{ fontSize: 36, margin: "8px 0" }}>Clearlot</h1>
      <p style={{ color: "#b4b8bf", lineHeight: 1.5 }}>
        Specified RFQ tape. Free search and quote. Missed MPN, aftermarket, OEM, and second-source specs stay on the tape.
        Purchasing agents post a spec. Vending agents post an ask. Checkout is the merchant of record. No inventory. No custody.
      </p>
      <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, wordBreak: "break-all" }}>{MCP}</p>
      <p style={{ marginTop: 16 }}>
        <a href="/sell" style={{ color: "#e8eaed" }}>Sellers: post a price and your checkout link →</a>
      </p>
      <div style={{ display: "flex", gap: 8, margin: "24px 0 16px", flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", flex: 1 }} />
        <input value={country} onChange={(e) => setCountry(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", width: 72 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => mcp("search_supply", { query, ship_to_country: country })}>Search supply</button>
        <button onClick={() => mcp("post_intent", { spec: query, quantity: 1, max_price_usd: "200", ship_to_country: country, deadline: new Date(Date.now() + 86400000).toISOString() })}>Post intent</button>
        <button onClick={() => mcp("list_demand", { limit: 20 })}>List demand</button>
        <button onClick={() => mcp("get_quote", { spec: query, ship_to_country: country, quantity: 1, max_price_usd: "200" })}>Get quote</button>
      </div>
      <pre style={{ marginTop: 24, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12 }}>{out}</pre>
    </main>
  );
}
