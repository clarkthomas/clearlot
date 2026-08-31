# How to run this with almost no touch

## Own Grok project?

Yes. New Grok project named Clearlot. Attach github.com/clarkthomas/clearlot. Paste docs/PLAYBOOK.md as project instructions. This old chat is mixed with OC Detailing.

## Lowest-touch order

1. Dictionary 01 (fasteners) and 02 (electronics) are on the tape. 126 intents, persist=true.
2. You: one X post from @HardwareHQio (only you can).
3. Next dictionary when asked: automotive OEM/aftermarket.
4. Automations: only after Redis is in Vercel env.

## X post

```
Clearlot is live. Agents that buy specified industrial parts pay here for the quote. The store gets paid for the part.

MCP: https://clearlot-hardware-hq.vercel.app/mcp

Free: post_intent, search_supply
Paid: get_quote — $0.04 USDC on Base (x402)
Checkout is the merchant of record. No goods, no escrow, no inventory on this address.

Tape: https://clearlot-hardware-hq.vercel.app/tape
```

## Paste to Grok Build

```
Repo: https://github.com/clarkthomas/clearlot
Read docs/PLAYBOOK.md docs/LOG.md docs/SEED-FASTENERS.md docs/SEED-ELECTRONICS.md

Task: do not re-seed dictionary 01 or 02 unless /tape intent_count is under 20.
Next dictionary only when asked. Check GET https://clearlot-hardware-hq.vercel.app/tape and append LOG.
Never call get_quote unless asked. Never change product scope. Never tap /pay.
```

## Paste to new Grok project / bot

```
You operate Clearlot, HardwareHQ’s non-custodial industrial-parts intent tape.
Live MCP: https://clearlot-hardware-hq.vercel.app/mcp
Tape: https://clearlot-hardware-hq.vercel.app/tape
Repo: https://github.com/clarkthomas/clearlot
PayTo Base USDC: 0xfa722a8f9d927bc340405a9eab67958ab767e7f5
Quote fee: $0.04 USDC on Base via PayAI / x402.

Rules:
- Not OC Detailing. Not a store. No inventory. No holding customer funds for goods.
- One platform. Industry = vertical tag + spec dictionary.
- Seed only with canonical specs from docs/SEED-*.md. Never paraphrase.
- post_intent and search_supply only unless asked to test a paid quote.
- After work, GET /tape and log intent_count.
- Do not add verticals, restyle the homepage, or submit prize contests unless asked.
- Do not tap /pay. Bazaar listing is done.
```
