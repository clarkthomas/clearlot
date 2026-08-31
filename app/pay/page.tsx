"use client";
import { useState } from "react";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CHAIN_ID = "0x2105";

function b64(obj: unknown) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function hexNonce() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return "0x" + Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function PayPage() {
  const [status, setStatus] = useState("Sign $0.04 USDC. No Send. No browser login.");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  async function signPay() {
    setBusy(true);
    try {
      const eth = (window as any).ethereum;
      if (!eth) {
        setStatus("Open this page inside Base App browser (the explorer), not Safari.");
        return;
      }
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) {
        setStatus("No account. In Base App pick the wallet that holds USDC.");
        return;
      }
      setAccount(from);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
      } catch {}

      const unpaid = await fetch("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_quote", arguments: { spec: "raspberry pi 5 kit", ship_to_country: "US", quantity: 1 } },
        }),
      });
      const reqHeader = unpaid.headers.get("PAYMENT-REQUIRED") || unpaid.headers.get("payment-required");
      if (unpaid.status !== 402 || !reqHeader) {
        const body = await unpaid.text();
        setStatus("No 402 from /mcp. HTTP " + unpaid.status + " " + body.slice(0, 240));
        return;
      }
      const challenge = JSON.parse(atob(reqHeader));
      const accept = (challenge.accepts || []).find((a: any) => a.asset && a.payTo) || challenge.accepts?.[0];
      if (!accept) {
        setStatus("402 had no payment option.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const authorization = {
        from,
        to: accept.payTo,
        value: String(accept.amount || accept.maxAmountRequired),
        validAfter: "0",
        validBefore: String(now + 600),
        nonce: hexNonce(),
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
        domain: {
          name: accept.extra?.name || "USD Coin",
          version: accept.extra?.version || "2",
          chainId: 8453,
          verifyingContract: accept.asset || USDC,
        },
        primaryType: "TransferWithAuthorization",
        message: authorization,
      };
      const signature = await eth.request({
        method: "eth_signTypedData_v4",
        params: [from, JSON.stringify(typed)],
      });
      const payload = {
        x402Version: challenge.x402Version || 2,
        scheme: accept.scheme || "exact",
        network: accept.network || "base",
        payload: { signature, authorization },
        accepted: accept,
        extensions: challenge.extensions || { bazaar: true },
      };
      const paid = await fetch("/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "PAYMENT-SIGNATURE": b64(payload),
          Accept: "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_quote", arguments: { spec: "raspberry pi 5 kit", ship_to_country: "US", quantity: 1 } },
        }),
      });
      const text = await paid.text();
      setStatus("HTTP " + paid.status + "\n" + text.slice(0, 1200));
    } catch (e: any) {
      setStatus(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <p style={{ letterSpacing: 2, fontSize: 12, color: "#8b9098" }}>CLEARLOT</p>
      <h1 style={{ fontSize: 28, margin: "8px 0" }}>Sign the nickel</h1>
      <p style={{ color: "#b4b8bf", lineHeight: 1.5 }}>
        Open this page in the Base App explorer. Tap once. That is a signature, not a Send. No ETH. No keys.coinbase.com.
      </p>
      {account ? (
        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, wordBreak: "break-all" }}>{account}</p>
      ) : null}
      <button
        disabled={busy}
        onClick={signPay}
        style={{ marginTop: 16, background: "#f5c518", color: "#0b0d10", border: 0, padding: "14px 18px", fontWeight: 700, width: "100%" }}
      >
        {busy ? "Waiting on wallet…" : "Approve $0.04 USDC"}
      </button>
      <pre style={{ marginTop: 20, background: "#14181e", padding: 12, whiteSpace: "pre-wrap", fontSize: 12 }}>{status}</pre>
    </main>
  );
}
