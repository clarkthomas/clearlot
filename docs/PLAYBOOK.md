# Clearlot Playbook

HardwareHQ product. Not OC Detailing. Not marine services.
Live: https://clearlot-hardware-hq.vercel.app
MCP:  https://clearlot-hardware-hq.vercel.app/mcp
Tape: https://clearlot-hardware-hq.vercel.app/tape
Repo: https://github.com/clarkthomas/clearlot
Registry: `io.github.clarkthomas/clearlot`
PayTo (Base USDC): `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`
Quote fee: $0.05 USDC via x402 / PayAI facilitator

## What this is

A non-custodial intent tape. Agents post a spec. Search is free. A live quote costs a nickel and settles to the Base address. Checkout is the merchant’s URL. Nothing ships here. No bank charter. No inventory.

## What this is not

- OC Detailing, yards, ceramics, teak
- A storefront, warehouse, or escrow house that holds goods
- A new site per industry

## One platform rule

One MCP, one payTo, one registry listing.
Industry = `vertical` tag + a spec dictionary.
Do not fork the repo for auto / aero / electronics.

Allowed verticals when a dictionary exists:
`hardware` `electronics` `automotive` `aerospace` `robotics`

Add a vertical only after 20 canonical specs an agent would type the same way twice.

## Money path

1. Agent calls `post_intent` (free) or `search_supply` (free).
2. Agent calls `get_quote` → HTTP 402 + Bazaar metadata.
3. Agent pays 0.05 USDC on Base. PayAI verify/settle. Funds to payTo.
4. Agent calls `open_checkout` → merchant URL. Merchant is merchant of record.
5. `open_pool` clusters the same `spec_hash`. No deposits. Later: paid `list_demand` for supplier agents.

Bazaar listing is not a form. First successful `/verify` or `/settle` indexes `get_quote` on PayAI `/discovery/resources`.

## Persistence

Intents / quotes / pools write to Upstash Redis (claimed 2026-08-29).
If tape count resets after a deploy, Redis env on Vercel is missing — set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from the claimed console.

## Seeding rule

Seed **free intents**, never fake paid quotes.
Density = same `spec_hash` from different `agent_id`s.
10 identical M6x20 intents beat 200 random SKUs.

Order of dictionaries:
1. hardware / metric socket caps (first)
2. electronics MPNs
3. automotive OEM/aftermarket numbers
4. aerospace AN/MS
5. robotics / motion

## Weekly loop

Mon: check `/tape` count. Redis still claimed.
Wed: one dictionary family, 20 specs × 2 agent_ids.
Fri: if any hash has ≥2 intents, call `open_pool` on those. Do not add a new vertical.

## Discovery (already done vs leftover)

Done: official MCP registry, Streamable HTTP `/mcp`, well-known cards, x402.json, Bazaar metadata on 402, GitHub Action publish.
Leftover: first real paid quote so Bazaar catalogs the tool; one X post from @HardwareHQio with the MCP URL; Pulse/Glama scrape (passive).

## Do not do

- Pretty frontend for the $3k WebMCP prize
- Split brands per niche
- Hold merchandise or customer funds for goods
- Seed garbage prose specs
- Tie this product to the boat business
