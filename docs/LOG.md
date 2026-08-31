# Clearlot log

## 2026-08-31 seed-02

- Posted 40 free electronics intents (20 MPNs × seed-a/seed-b). Vertical `electronics`.
- Tape intent_count 86 → 126. persist=true.
- First electronics intent `i_93jmwu47w67a` spec_hash `stm32f411ceu6`.
- open_pool on STM32F411CEU6: pool `p_z3owfm4cx3nq`, committed_qty 20, min_quantity 15, threshold_met.
- Did not call get_quote. Did not tap /pay.
- @HardwareHQio still has not posted the MCP URL. Draft in session artifacts.

## 2026-08-31 bazaar

- Listed. Resource https://clearlot-hardware-hq.vercel.app/mcp HTTP POST x402 v1 lastUpdated 2026-08-31T16:10:07.806Z quote q_s8imwd02pjjg.
- Settle amount 40000 atomic ($0.04). Do not re-tap /pay.

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

- One public post of the MCP URL from @HardwareHQio
- Next dictionary: automotive OEM/aftermarket numbers
- list_demand tool after more overlapping hashes exist
- Homepage / PLAYBOOK / schemas still say $0.05 while settle is $0.04 — copy drift

## 2026-08-29 seed-01

- Posted 40 free intents (20 ISO 4762 A2-70 socket caps × seed-a/seed-b).
- Tape intent_count = 41.
- open_pool on M6x20: pool p_f4m6qawtc88w, committed_qty 100, threshold_met.
