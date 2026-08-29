# Clearlot

HardwareHQ intent-clearing house for agentic commerce.

Agents post demand. Clearlot finds live supply across Shopify Catalog, storefront MCP, and UCP merchants. The agent pays **Clearlot** a small fee for the quote. The buyer pays the **merchant** at checkout. Goods ship to the buyer. Clearlot never holds inventory, title, or buyer principal.

Repo: https://github.com/clarkthomas/clearlot

## One-screen rules

1. Never take possession of goods.
2. Never take possession of the buyer’s merchandise funds.
3. Never issue transferable claims, tokens, or lot-futures.
4. Merchant stays merchant of record.
5. Charge only for coordination: quotes, pool signals, fill stats.
6. First vertical: hardware parts + MRO.
7. Walk-away ops: failed quotes auto-refund the fee; no human in the money path.

## Grok bots

See [docs/WORKFLOW.md](docs/WORKFLOW.md). Daily protocol watch + weekday Catalog seed probe.

## Implement

Paste [prompts/IMPLEMENTATION-PROMPT.md](prompts/IMPLEMENTATION-PROMPT.md) into a coding agent with this repo as context.
