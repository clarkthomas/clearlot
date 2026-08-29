# Tools spec

Five MCP tools, same names on the WebMCP page: post_intent (free), search_supply (free, stale ok), get_quote (x402 $0.05), open_checkout (no order placement), open_pool (x402 $0.25, no deposits).

Always include meta.ucp-agent.profile on Catalog calls and ships_to country. Convert UCP minor units to decimal USD.

Upstream: search_catalog, lookup_catalog, get_product on https://catalog.shopify.com/api/ucp/mcp and https://{store}/api/ucp/mcp.
