# CONTINUE — Clearlot (full context)

Updated 2026-08-30. Operator: HardwareHQ / @HardwareHQio / GitHub `clarkthomas`.

## Product
Clearlot is an intent tape + priced quote engine for hardware and MRO. Agents pay Clearlot for live quotes. Buyers pay merchants. Goods never come to HardwareHQ. Merchandise funds never sit in an operator wallet.

## Hard no
Operator escrow, token/NFT/lot-futures, inventory, unofficial Shopify checkout scrape, admin APIs. Do not restyle the homepage. Do not fork per vertical. Do not tie this to OC Detailing.

## Already live
Repo https://github.com/clarkthomas/clearlot
App https://clearlot-hardware-hq.vercel.app
MCP https://clearlot-hardware-hq.vercel.app/mcp
Tape https://clearlot-hardware-hq.vercel.app/tape
Registry `io.github.clarkthomas/clearlot`
payTo (Base USDC) `0xfa722a8f9d927bc340405a9eab67958ab767e7f5`
Quote fee $0.05 USDC via x402 / PayAI
Protocol Watch daily 08:00 ET taskId 25204d1b-9a2b-4e4f-9568-00fc021e2aff
Seed Probe weekdays 09:30 ET taskId 803de9e4-c17e-4cf7-b9d3-d7239cdaa587
Tape persist=true. Intent count 44+ as of 2026-08-30.

## Not live
First settled nickel. Bazaar catalog of get_quote. Public X post of the MCP URL. Wallet USDC balance is $0.

## Resume
1. Fund Base Account `0xfa722a8f9d927bc340405a9eab67958ab767e7f5` with USDC on Base.
2. Replay get_quote so PayAI /verify+/settle fires. That indexes Bazaar.
3. Post from @HardwareHQio: MCP URL + nickel price + no custody.
4. Do not add dictionaries. Do not build list_demand yet.
