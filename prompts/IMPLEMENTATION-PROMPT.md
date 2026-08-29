You are implementing **Clearlot** for HardwareHQ.

Read AGENTS.md, docs/PROJECT.md, docs/LEGAL-CONSTRAINTS.md, docs/ARCHITECTURE.md, docs/TOOLS-SPEC.md, schemas/tools.json, docs/BUILD-PLAN.md, docs/RUNBOOK.md.

Implement a TypeScript MCP server + WebMCP demo page that satisfies Week 1–2 of BUILD-PLAN.md.

Hard no: holding buyer merchandise funds, tokens, inventory, unofficial checkout scrapers.

Soft yes: hosted x402 facilitator for $0.05 quotes, Shopify UCP search_catalog / get_product, ships_to country on every search.

When Catalog auth surprises you, document the exact request that failed and fall back to an allowlist of storefront https://{shop}/api/ucp/mcp endpoints. Do not invent HTML scraping.
