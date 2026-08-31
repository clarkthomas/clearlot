# CONTINUE — Clearlot

Updated 2026-08-31 15:05 ET. Operator: HardwareHQ / @HardwareHQio / GitHub `clarkthomas`.

## Product
Non-custodial hardware/MRO intent tape. Agents pay Clearlot for live quotes. Buyers pay merchants. Goods never come here. Merchandise funds never sit in an operator wallet. Not OC Detailing. Not the HardwareHQ GPU catalog.

## Hard no
Operator escrow. Tokens/NFTs on lots. Inventory. Unofficial Shopify admin scrape. Homepage restyle. Fork per vertical. Tie to OC Detailing. Re-tap `/pay` to “confirm” Bazaar.

## Live
- Repo https://github.com/clarkthomas/clearlot
- App https://clearlot-hardware-hq.vercel.app
- MCP https://clearlot-hardware-hq.vercel.app/mcp
- Pay (sign only) https://clearlot-hardware-hq.vercel.app/pay
- Tape https://clearlot-hardware-hq.vercel.app/tape
- Registry `io.github.clarkthomas/clearlot`
- payTo `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`
- Quote fee **$0.04 USDC** (40000 atomic) via PayAI facilitator on Base
- Bazaar row: resource `/mcp`, type http POST, x402 v1, lastUpdated `2026-08-31T16:10:07.806Z`
- Listing quote `q_s8imwd02pjjg`
- Listing payer `0x0bdb6a68ed74eed9242f519756dac8d3e09e04c6` (phone Base App). Session MCP wallet is not the payer.
- Tape 2026-08-31 15:05 ET: persist=true intent_count=126 quote_mem=0

## Listing wire (do not revert)
`paymentPayload.resource` must be the URL string. v1 `outputSchema.input` `{ type: "http", method: "POST", discoverable: true }` on requirements sent to PayAI `/verify` and `/settle`. `listing: null` means not indexed. `processing` / `success` means accepted. v2-only MCP blob failed three paid quotes.

## Seeded
- Dictionary 01 hardware / ISO 4762 socket caps — 40 intents, pool `p_f4m6qawtc88w` on M6x20.
- Dictionary 02 electronics MPNs — 40 intents, pool `p_z3owfm4cx3nq` on STM32F411CEU6, threshold_met.

## Next (in order)
1. X post from @HardwareHQio: MCP URL + $0.04 + merchant-of-record checkout + no goods on this address. This session cannot publish to X.
2. Dictionary 03 automotive OEM/aftermarket numbers. 20 specs × 2 agent_ids, free `post_intent` only.
3. Then aerospace AN/MS, then robotics/motion.
4. `list_demand` only after more real overlapping hashes.
5. If tape resets, fix Upstash on Vercel. Do not rebuild.
