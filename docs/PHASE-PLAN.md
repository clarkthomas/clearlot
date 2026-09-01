# Clearlot phased plan — capture + discovery

Operator 2026-08-31 22:45 ET. Begin now. Do not re-tap /pay. No custody. No inventory. One MCP.

## North star
Volume of stranger specs on the tape. Agents find us in registries. They never need the homepage.

## Phase 0 — Door (in flight)
Goal: a discovered agent does not bounce.
- [ ] Drop get_quote 402 in `app/mcp/route.ts`
- [x] `recordSearch` in `lib/store.ts`
- [x] `/tape` exposes `search_count` `miss_count`
- [x] Spec-token match in `lib/catalog.ts` (`matchingCatalogHits`)
- [ ] `search_supply` + `get_quote` call `recordSearch`
- [ ] Homepage / x402.json stop advertising $0.04
Done when: live `get_quote` returns 200 with `paid:false` and a miss moves `/tape` `search_count`.

## Phase 1 — Cards (this commit)
Goal: every machine-readable surface says the same job.
Story: Specified RFQ tape. Free search and quote. Missed specs stay. Merchant checkout. No stock here.
Keywords: RFQ, MPN, aftermarket, OEM, second-source, specified part, intent tape.
Files: llms.txt, glama.json, server.json, well-known cards, server-card, CONTINUE.
Done when: curl of those URLs no longer mentions a quote fee.

## Phase 2 — Phone books
Goal: agents that search registries get our MCP URL.
- Official registry `io.github.clarkthomas/clearlot` — already live; republish after server.json description change.
- PayAI Bazaar — already listed. Leave it. Do not re-tap /pay.
- Glama — claim clarkthomas/clearlot (OAuth). Need operator GitHub login.
- Smithery — publish remote `https://clearlot-hardware-hq.vercel.app/mcp` at smithery.ai/new or `smithery mcp publish`.
- PulseMCP — wait for official-registry ingest or email hello@pulsemcp.com.
- MCPfinder — free if official + Glama + Smithery are clean.
Done when: Glama and Smithery search for "clearlot" or "RFQ specified part" return the MCP URL.

## Phase 3 — Sellers
Goal: one vendor agent watches `list_demand` and posts offers.
Do not add SKU dictionaries. Hunt distributors that live outside Coupa punchout.
Pitch: free demand signal now; paid hash subscription later.
Done when: `/tape` `offer_count` > 1 from a non-seed actor.

## Phase 4 — Public
Only after Phase 0 is live and Phase 2 listings exist.
One @HardwareHQio post. Venue sentence + MCP URL. Not fasteners. Not $0.04.

## Hard no
Scrape Grainger / Digi-Key / Coupa. Inject into foreign agents. Fake Bazaar traffic. Re-tap /pay. Escrow. Inventory.
