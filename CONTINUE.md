# CONTINUE — Clearlot

Updated 2026-08-31 22:45 ET. Operator: HardwareHQ / @HardwareHQio / GitHub `clarkthomas`.

## Product
Specified-commerce tape. Purchasing agents post a spec or just search. Vending agents post an ask and cover. Quotes are free until two-sided traffic exists. Then sell demand data back to vendors. Buyers pay merchants. Goods never come here. Not OC Detailing. Not the HardwareHQ GPU catalog.

## Hard no
Operator escrow. Tokens/NFTs on lots. Inventory. Unofficial Shopify admin scrape. Fork per vertical. Tie to OC Detailing. Re-tap `/pay` to “confirm” Bazaar. Scrape Grainger/Digi-Key/Coupa.

## Live
- Repo https://github.com/clarkthomas/clearlot
- App https://clearlot-hardware-hq.vercel.app
- MCP https://clearlot-hardware-hq.vercel.app/mcp
- Tape https://clearlot-hardware-hq.vercel.app/tape
- Registry `io.github.clarkthomas/clearlot`
- payTo `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`
- Bazaar listed 2026-08-31T16:10:07.806Z quote q_s8imwd02pjjg. Do not re-tap /pay.
- Plan: docs/PHASE-PLAN.md

## Tools
All free until traffic exists: post_intent, post_offer, list_demand, cover_intent, search_supply, get_quote, open_checkout, open_pool
Later paid: list_demand feed / subscribe_hash to vendors

## Seeded dictionaries (do not redo)
- 01 hardware ISO 4762 — pool p_f4m6qawtc88w
- 02 electronics MPNs — pool p_z3owfm4cx3nq on stm32f411ceu6

## Now
Phase 0: land route.ts (drop 402 + recordSearch).
Phase 1: discovery copy (this commit).
Phase 2: claim Glama, publish Smithery. Operator GitHub login required.
Phase 3: sellers.
Phase 4: X post from @HardwareHQio only after 0–2.
