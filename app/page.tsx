"use client";
import { useEffect, useState } from "react";

const PAY_TO = "0xfa722a8f9d927bc340405a9eab67958ab767e7f5";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AMOUNT = "50000"; // 0.05 USDC
const SITE = "https://clearlot-hardware-hq.vercel.app";

function hexRand32() {
  const n = new Uint8Array(32);
  crypto.getRandomValues(n);
  return "0x" + Array.from(n).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64(obj: unknown) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

export default function Page() {
  const [query, setQuery] = useState("raspberry pi 5 kit");
  const [country, setCountry] = useState("US");
  const [out, setOut] = useState("Ready.");
  const [paying, setPaying] = useState(false);

  async function mcp(name: string, args: object, extra: Record<string, string> = {}) {
    const res = await fetch("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...extra },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    const json = await res.json();
    setOut(JSON.stringify({ http: res.status, ...json }, null, 2));
    return { res, json };
  }

  async function payNickel() {
    setPaying(true);
    setOut("Connecting phone wallet…");
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) {
        throw new Error("Open this page inside Base App browser, then tap Pay.");
      }
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) throw new Error("No account connected.");
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      } catch {}

      const balHex = await eth.request({
        method: "eth_call",
        params: [{ to: USDC, data: "0x70a08231" + from.slice(2).toLowerCase().padStart(64, "0") }, "latest"],
      });
      const usdc = Number(BigInt(balHex || "0x0")) / 1e6;
      if (usdc < 0.05) {
        setOut(JSON.stringify({
          paid: false,
          connected: from,
          usdc_on_base: usdc,
          error: "This is the empty account. In Base App switch to the wallet that actually holds USDC, reload, tap Pay.",
        }, null, 2));
        return;
      }

      const nonce = hexRand32();
      const validBefore = String(Math.floor(Date.now() / 1000) + 3600);
      const authorization = {
        from,
        to: PAY_TO,
        value: AMOUNT,
        validAfter: "0",
        validBefore,
        nonce,
      };
      const typed = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        domain: { name: "USD Coin", version: "2", chainId: 8453, verifyingContract: USDC },
        message: authorization,
      };
      setOut("Sign $0.05 USDC. No ETH. No Coinbase.com.");
      const signature = await eth.request({
        method: "eth_signTypedData_v4",
        params: [from, JSON.stringify(typed)],
      });
      const payload = {
        x402Version: 2,
        scheme: "exact",
        network: "eip155:8453",
        accepted: {
          scheme: "exact",
          network: "eip155:8453",
          amount: AMOUNT,
          maxAmountRequired: AMOUNT,
          asset: USDC,
          payTo: PAY_TO,
          extra: { name: "USD Coin", version: "2" },
        },
        payload: { signature, authorization },
      };
      const header = b64(payload);
      await mcp(
        "get_quote",
        { spec: query, ship_to_country: country, quantity: 1, max_price_usd: "200" },
        { "PAYMENT-SIGNATURE": header, "X-PAYMENT": header }
      );
    } catch (err: any) {
      setOut(JSON.stringify({
        paid: false,
        error: err?.message || String(err),
        hint: "You should see a SIGN sheet, not a send. If USDC shows $0, that connected account is empty — switch wallets in the app.",
      }, null, 2));
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
          {paying ? "Sign in wallet…" : "Pay $0.05 USDC"}
        </button>
      </div>
      <pre style={{ marginTop: 24, background: "#14181e", padding: 16, overflow: "auto", fontSize: 12 }}>{out}</pre>
      <p style={{ fontSize: 12, color: "#8b9098" }}>
        Sign only. No ETH. If it says empty, Base App connected the wrong account — switch to the one with USDC.
      </p>
    </main>
  );
}
