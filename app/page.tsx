"use client";
import { useEffect, useState } from "react";

const PAY_TO = "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AMOUNT = 50_000n; // 0.05 USDC, 6 decimals
const SITE = "https://clearlot-hardware-hq.vercel.app";

function transferData(to: string, amount: bigint) {
  return (
    "0xa9059cbb" +
    to.slice(2).toLowerCase().padStart(64, "0") +
    amount.toString(16).padStart(64, "0")
  );
}

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

  async function payNickel() {
    setPaying(true);
    setOut("Requesting $0.05 USDC from the wallet on this phone…");
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) {
        throw new Error(
          "No wallet injected. Open Base App → browser → paste " + SITE + " → tap Pay. Do not use Grok or Coinbase.com."
        );
      }
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) throw new Error("Wallet connected but no account.");
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x2105",
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }],
        });
      }
      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: USDC, data: transferData(PAY_TO, AMOUNT), value: "0x0" }],
      });
      setOut(JSON.stringify({
        paid: true,
        amount: "0.05 USDC",
        from,
        to: PAY_TO,
        token: USDC,
        tx: hash,
        basescan: "https://basescan.org/tx/" + hash,
      }, null, 2));
    } catch (err: any) {
      setOut(JSON.stringify({
        paid: false,
        error: err?.message || String(err),
        hint: "Open Base App on this phone, paste " + SITE + " in its browser, tap Pay. Needs a little ETH on Base for gas.",
      }, null, 2));
    } finally {
      setPaying(false);
    }
  }

  function openInBaseApp() {
    const encoded = encodeURIComponent(SITE);
    window.location.href = "cbwallet://dapp?url=" + encoded;
    setTimeout(() => {
      window.location.href = "https://go.cb-w.com/dapp?cb_url=" + encoded;
    }, 800);
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
          {paying ? "Confirm in wallet…" : "Pay $0.05 USDC"}
        </button>
        <button onClick={openInBaseApp}>Open in Base App</button>
      </div>
      <pre style={{ marginTop: 24, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12 }}>{out}</pre>
      <p style={{ fontSize: 12, color: "#8b9098" }}>
        Pay uses the wallet on this phone. Open the site inside Base App, then tap Pay. No Coinbase.com.
      </p>
    </main>
  );
}
