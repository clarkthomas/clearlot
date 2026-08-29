# Agent instructions — Clearlot

You are implementing Clearlot for HardwareHQ (operator: HardwareHQDev / @HardwareHQio). Read this file before writing code. If a request conflicts with the hard constraints, refuse that part and implement the rest.

## Hard constraints (non-negotiable)

- Do not collect, hold, or transmit buyer merchandise funds.
- Do not accept physical inventory at any HardwareHQ address.
- Do not create a token, NFT, or tradable claim on a pool or lot.
- Do not reverse-engineer Shopify checkout GraphQL or tokenize cards yourself.
- Do not scrape merchant admin APIs. Shopper-side Catalog + Storefront UCP MCP + public WebMCP only.
- Do not promise a fill. Quotes expire. Checkout is the merchant’s.
- Do not build a pooled wallet “escrow” that lands USDC in an operator key.

## Product

Clearlot is an intent tape + priced quote engine.

1. Agent or human posts an intent (spec / MPN / UPID, qty, max price, ship-to country, deadline).
2. Matcher searches Shopify Global Catalog (`https://catalog.shopify.com/api/ucp/mcp`) and selected storefronts (`https://{store}/api/ucp/mcp`).
3. `get_quote` is x402-gated and returns ranked live offers + merchant checkout URL.
4. Buyer completes purchase on the merchant. Clearlot is not merchant of record.

## Implement first

MCP server with five tools in docs/TOOLS-SPEC.md. WebMCP page via document.modelContext. x402 on get_quote and open_pool. Seed 10 hardware/MRO queries.

## Source of truth

docs/PROJECT.md for intent. docs/LEGAL-CONSTRAINTS.md if money movement is proposed. docs/TOOLS-SPEC.md for interfaces. This file wins over chat history.
