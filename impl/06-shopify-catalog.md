# 06 Catalog
POST https://catalog.shopify.com/api/ucp/mcp tools search_catalog lookup_catalog get_product.
Always ships_to + catalog.context.address_country + agent profile.
Optional CATALOG_STOREFRONTS=host1,host2 fans out to https://{shop}/api/ucp/mcp when Global is thin.
No HTML scrape.
