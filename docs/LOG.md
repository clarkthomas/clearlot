# Clearlot log

## 2026-08-30

- Execution order: ship the first settled nickel. Do not write more doctrine.
- Live tape: persist=true, intent_count moved 43 → 44 after post_intent `i_i8bnrutuycjb` (ISO 4766 A2-70 M6x20, spec_hash `iso4762 m6x20 a2 70`).
- get_quote returns HTTP 402 with x402 v2 challenge, PayAI facilitator, payTo `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`, 0.05 USDC on Base.
- quote_mem still 0. No Bazaar index until first /verify or /settle.
- Base Account is the payTo address. Portfolio on Base: $0.00 USDC.
- initiate_x402_request blocked on insufficient_funds. Funding request `fb4c1cb5-2d11-498d-a40d-e39c7fae3895` wants 0.0505 USDC on Base, then the 402 call resumes.
- Separate $5 USDC fund request opened so the wallet can settle ~100 quotes without another on-ramp.
- @HardwareHQio still has not posted the MCP URL.

## 2026-08-29

- Product defined: non-custodial hardware/MRO intent tape (HardwareHQ). Explicitly not OC Detailing.
- Repo: clarkthomas/clearlot. Vercel: https://clearlot-hardware-hq.vercel.app
- MCP Streamable HTTP live at POST /mcp. Protocol 2025-06-18. Tools: post_intent, search_supply, get_quote, open_checkout, open_pool.
- x402 get_quote: 0.05 USDC on Base, payTo 0xfa722a8f9d927bc340405a9eab67958ab767e7f5, PayAI facilitator settle.
- Discovery routes live: /.well-known/mcp, mcp.json, server-card, /x402.json, /agent-profile.json.
- Official MCP Registry published: io.github.clarkthomas/clearlot (active). GitHub Action OIDC publish works.
- Persistence: Upstash Redis claimed by user. /tape persist=true.
- vertical tag added. Bazaar extensions + outputSchema on 402 body.
- WebMCP challenge deprioritized vs network density.
- Niches are industrial spec classes, not the boat business.

## Open

- First settled nickel (Bazaar index + wallet credit) — waiting on Base USDC
- One public post of the MCP URL from @HardwareHQio
- list_demand tool after more families exist

## 2026-08-29 seed-01

- Posted 40 free intents (20 ISO 4762 A2-70 socket caps × seed-a/seed-b).
- Tape intent_count = 41.
- open_pool on M6x20: pool p_f4m6qawtc88w, committed_qty 100, threshold_met.
