"use client";
import { useEffect, useState } from "react";

const PAY_TO = "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";

export default function Page() {
  const [query, setQuery] = useState("raspberry pi 5 kit");
  const [country, setCountry] = useState("US");
  const [out, setOut] = useState("Ready.");
  const [copied, setCopied] = useState("");

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

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("select-and-copy");
    }
  }

  useEffect(() => {
    const ctx = (window as any).document?.modelContext;
    if (!ctx?.registerTool) return;
    for (const name of ["post_intent", "search_supply", "get_quote", "open_checkout", "open_pool"]) {
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
        Intent tape for parts. Nickel for a live quote. Store gets paid for the part. Nothing ships here.
      </p>
      <div style={{ margin: "24px 0", padding: 16, border: "1px solid #2a313a", background: "#14181e" }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Pay $0.05 USDC on Base</p>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#b4b8bf" }}>
          Use the Send screen in the account that already shows USDC. Do not open this page inside a wallet browser.
        </p>
        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, wordBreak: "break-all", margin: "0 0 8px" }}>
          To: {PAY_TO}
        </p>
        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, margin: "0 0 12px" }}>
          Amount: 0.05 · Asset: USDC · Network: Base
        </p>
        <button onClick={() => copy("address", PAY_TO)} style={{ background: "#f5c518", color: "#0b0d10", border: 0, padding: "10px 14px", fontWeight: 700 }}>
          {copied === "address" ? "Copied" : "Copy address"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "0 0 16px", flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", flex: 1 }} />
        <input value={country} onChange={(e) => setCountry(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", width: 72 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => mcp("search_supply", { query, ship_to_country: country })}>Search supply</button>
        <button onClick={() => mcp("post_intent", { spec: query, quantity: 1, max_price_usd: "200", ship_to_country: country, deadline: new Date(Date.now() + 86400000).toISOString() })}>Post intent</button>
        <button onClick={() => mcp("get_quote", { spec: query, ship_to_country: country, quantity: 1, max_price_usd: "200" })}>Get quote</button>
      </div>
      <pre style={{ marginTop: 24, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12 }}>{out}</pre>
    </main>
  );
}
