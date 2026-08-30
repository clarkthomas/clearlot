"use client";
import { useEffect, useState } from "react";

const PAY_TO = "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const PAY_USD = "0.05";

export default function Page() {
  const [query, setQuery] = useState("raspberry pi 5 kit");
  const [country, setCountry] = useState("US");
  const [out, setOut] = useState("Ready.");
  const [paying, setPaying] = useState(false);

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

  async function loadBasePay() {
    const w = window as any;
    if (w.base?.pay) return w.base.pay;
    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("base-account-sdk");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Base Pay script failed")));
        if (w.base?.pay) resolve();
        return;
      }
      const s = document.createElement("script");
      s.id = "base-account-sdk";
      s.src = "https://unpkg.com/@base-org/account/dist/base-account.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Base Pay script failed to load"));
      document.head.appendChild(s);
    });
    if ((window as any).base?.pay) return (window as any).base.pay;
    const mod: any = await import("https://esm.sh/@base-org/account");
    return mod.pay || mod.base?.pay;
  }

  async function payNickel() {
    setPaying(true);
    setOut("Opening Base Pay for $0.05 USDC…");
    try {
      const pay = await loadBasePay();
      if (!pay) throw new Error("Base Pay is not available. Open this page in Base App and tap Pay again.");
      const result = await pay({ amount: PAY_USD, to: PAY_TO, testnet: false });
      setOut(JSON.stringify({ paid: true, amount: PAY_USD, to: PAY_TO, result }, null, 2));
    } catch (err: any) {
      setOut(JSON.stringify({ paid: false, error: err?.message || String(err) }, null, 2));
    } finally {
      setPaying(false);
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
      <div style={{ display: "flex", gap: 8, margin: "24px 0", flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", flex: 1 }} />
        <input value={country} onChange={(e) => setCountry(e.target.value)} style={{ background: "#14181e", color: "#e8eaed", border: "1px solid #2a313a", padding: "10px 12px", width: 72 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => mcp("search_supply", { query, ship_to_country: country })}>Search supply</button>
        <button onClick={() => mcp("post_intent", { spec: query, quantity: 1, max_price_usd: "200", ship_to_country: country, deadline: new Date(Date.now() + 86400000).toISOString() })}>Post intent</button>
        <button onClick={() => mcp("get_quote", { spec: query, ship_to_country: country, quantity: 1, max_price_usd: "200" })}>Get quote</button>
        <button
          onClick={payNickel}
          disabled={paying}
          style={{ background: "#f5c518", color: "#0b0d10", border: 0, padding: "10px 14px", fontWeight: 700 }}
        >
          {paying ? "Opening Base Pay…" : "Pay $0.05 USDC"}
        </button>
      </div>
      <pre style={{ marginTop: 24, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12 }}>{out}</pre>
      <p style={{ fontSize: 12, color: "#8b9098" }}>MCP POST /mcp · unpaid quote = 402 · yellow button is temporary Base Pay</p>
    </main>
  );
}
