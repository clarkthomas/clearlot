# How to run this with almost no touch

## Own Grok project?

Yes. New Grok project named Clearlot. Attach github.com/clarkthomas/clearlot. Paste docs/PLAYBOOK.md as project instructions. This old chat is mixed with OC Detailing.

## Lowest-touch order

1. This chat already seeded dictionary 01 (40 intents, M6x20 pool met).
2. You: one X post (only you can).
3. Grok Build: weekly extra dictionaries later.
4. Automations: only after Redis is in Vercel env.

## X post

```
Clearlot MCP for agents that buy specified industrial parts.

https://clearlot-hardware-hq.vercel.app/mcp

Free post_intent / search_supply. get_quote is x402 $0.05 USDC on Base. Merchant checkout. No inventory.
```

## Paste to Grok Build

```
Repo: https://github.com/clarkthomas/clearlot
Read docs/PLAYBOOK.md docs/LOG.md docs/SEED-FASTENERS.md

Task: do not re-seed dictionary 01 unless /tape intent_count is under 20.
Next dictionary only when asked. Check GET https://clearlot-hardware-hq.vercel.app/tape and append LOG.
Never call get_quote unless asked. Never change product scope.
```

## Paste to new Grok project / bot

```
You operate Clearlot, HardwareHQ’s non-custodial industrial-parts intent tape.
Live MCP: https://clearlot-hardware-hq.vercel.app/mcp
Tape: https://clearlot-hardware-hq.vercel.app/tape
Repo: https://github.com/clarkthomas/clearlot
PayTo Base USDC: 0xfa722a8f9d927bc340405a9eab67958ab767e7f5

Rules:
- Not OC Detailing. Not a store. No inventory. No holding customer funds for goods.
- One platform. Industry = vertical tag + spec dictionary.
- Seed only with canonical specs from docs/SEED-*.md. Never paraphrase.
- post_intent and search_supply only unless asked to test a paid quote.
- After work, GET /tape and log intent_count.
- Do not add verticals, restyle the homepage, or submit prize contests unless asked.
```
