# CONTINUE — Clearlot

Updated 2026-08-31 15:40 ET. Operator: HardwareHQ / @HardwareHQio / GitHub `clarkthomas`.

## Product
Specified-commerce tape. Purchasing agents post intents. Vending agents post offers and cover intents. Agents pay Clearlot for live quotes and later for demand signals. Buyers pay merchants. Goods never come here. Merchandise funds never sit in an operator wallet. Not OC Detailing. Not the HardwareHQ GPU catalog.

## Hard no
Operator escrow. Tokens/NFTs on lots. Inventory. Unofficial Shopify admin scrape. Fork per vertical. Tie to OC Detailing. Re-tap `/pay` to “confirm” Bazaar.

## Live
- Repo https://github.com/clarkthomas/clearlot
- App https://clearlot-hardware-hq.vercel.app
- MCP https://clearlot-hardware-hq.vercel.app/mcp
- Tape https://clearlot-hardware-hq.vercel.app/tape
- Registry `io.github.clarkthomas/clearlot`
- payTo `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`
- Quote fee **$0.04 USDC** (40000 atomic) via PayAI facilitator on Base
- Bazaar listed 2026-08-31T16:10:07.806Z quote q_s8imwd02pjjg. Do not re-tap /pay.

## Tools
Free: post_intent, post_offer, list_demand, cover_intent, search_supply, open_checkout, open_pool
Paid: get_quote (x402 $0.04)
Not built: paid list_demand, subscribe_hash, interchange graph, index prints

## Seeded dictionaries (do not redo)
- 01 hardware ISO 4762 — pool p_f4m6qawtc88w
- 02 electronics MPNs — pool p_z3owfm4cx3nq on stm32f411ceu6

## Next
1. Prove two-sided loop on live MCP: post_offer + list_demand + cover_intent against an existing hash.
2. Hold more SKU dictionaries until that loop is visible on /tape offer_count.
3. Then X post: venue sentence, not fastener sentence.
4. If tape resets, fix Upstash on Vercel.
