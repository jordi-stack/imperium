# ⚔ Imperium

**Multi-Chain Financial Command Center  - powered by MoonPay CLI + OpenWallet Standard**

> Monitor, protect, and rebalance your crypto portfolio across all chains  - from one terminal.

## Problem

Crypto portfolios are fragmented across multiple chains (Ethereum, Base, Polygon, Arbitrum). You can't see total allocation in one place, can't detect rug pulls until it's too late, and rebalancing requires hours of manual swaps across different UIs.

## Solution

Imperium is a CLI-based financial agent that gives you a unified command center for your entire crypto portfolio. It uses **MoonPay CLI** as the execution layer (swaps, bridges, market data) and **OpenWallet Standard** as the security layer (wallet management, transaction signing, spending policies).

## Architecture

```
User (CLI)
    │
    ▼
index.ts (command router)
    │
    ├──▶ core/portfolio.ts ──┐
    ├──▶ core/risk.ts ───────┤                    ┌──▶ MoonPay CLI (MCP)
    ├──▶ core/rebalance.ts ──┼──▶ policy gate ────┤
    └──▶ core/discovery.ts ──┘   (wallet/policy)  └──▶ OWS wallet (sign)
```

**Key design decisions:**
- MoonPay CLI connected via **real MCP protocol** (Model Context Protocol) using the official `@modelcontextprotocol/sdk`
- OWS handles **wallet creation and transaction signing**  - keys never leave the vault
- Custom **policy engine** gates every transaction (daily limits, per-tx limits, token blocklist, slippage caps)
- **Demo mode** (`--demo`) uses fixture data so you can try everything without real funds

## Quick Start

```bash
# Install
git clone https://github.com/YOUR_USERNAME/imperium.git
cd imperium
npm install

# Try it (demo mode  - no crypto needed)
npx tsx src/index.ts --demo portfolio
npx tsx src/index.ts --demo risk scan
npx tsx src/index.ts --demo discover trending base
npx tsx src/index.ts --demo discover whales base

# Set up rebalancing
npx tsx src/index.ts --demo rebalance target ETH:50 USDC:50
npx tsx src/index.ts --demo rebalance preview
npx tsx src/index.ts --demo policy set --daily-limit 5000 --tx-limit 4000
npx tsx src/index.ts --demo rebalance execute

# Run tests
npm test
```

## Commands

### Portfolio
```bash
imperium portfolio              # Holdings + allocation table
imperium portfolio pnl          # Profit & loss breakdown
imperium portfolio activity base # Recent transactions
```

### Risk Analysis
```bash
imperium risk scan              # Scan ALL holdings for rug pulls, low liquidity
imperium risk check 0xABC base  # Check a specific token
```

Risk scoring is **rule-based and transparent**:
- Holder concentration > 50% → +40 risk
- Low liquidity (< $10K) → +30 risk
- Community warnings → +20 risk
- Score ≥ 70 → SELL | 40-69 → WATCH | < 40 → HOLD

### Rebalancing
```bash
imperium rebalance target ETH:50 USDC:50  # Set target allocation
imperium rebalance preview                 # Dry run  - see drift + proposed swaps
imperium rebalance execute                 # Execute swaps (policy-checked)
```

The rebalancer:
1. Calculates current allocation vs target
2. Identifies drift and generates swap actions
3. Checks each action against the **OWS policy engine**
4. Signs via OWS wallet, executes via MoonPay CLI

### Discovery
```bash
imperium discover trending base   # Trending tokens
imperium discover whales base     # Smart money wallets (top PnL)
imperium discover search "pepe"   # Search tokens
```

### Policy Management
```bash
imperium policy show                              # View current policy
imperium policy set --daily-limit 500 --tx-limit 200 --max-slippage 2
imperium policy set --block SCAM,RUG             # Block specific tokens
imperium policy set --approve ETH,USDC,WBTC      # Whitelist only these tokens
```

### Initialization
```bash
imperium init    # Create OWS wallet, save config to ~/.imperium/config.json
```

## MoonPay CLI Integration (13 Tools)

Imperium connects to MoonPay CLI via **MCP (Model Context Protocol)**  - the same protocol used by Claude Desktop and Claude Code. This is a real stdio transport connection, not shell exec.

| # | Tool | What Imperium Does With It |
|---|------|---------------------------|
| 1 | `token_balance_list` | Show portfolio holdings across chains |
| 2 | `token_retrieve` | Get detailed token market data |
| 3 | `wallet_pnl_retrieve` | Calculate profit & loss |
| 4 | `wallet_activity_list` | Show recent transaction history |
| 5 | `buy` | Fiat → crypto onramp (checkout URL) |
| 6 | `deposit_create` | Multi-chain deposit link generation |
| 7 | `token_check` | Safety scan  - rug pull, liquidity, holder analysis |
| 8 | `token_holder_list` | Whale concentration analysis |
| 9 | `token_swap` | Execute rebalance swaps |
| 10 | `token_bridge` | Cross-chain bridges |
| 11 | `token_trending_list` | Discover trending tokens |
| 12 | `wallet_discover` | Find smart money wallets |
| 13 | `token_search` | Search tokens by name/symbol |

## OpenWallet Standard Integration

OWS provides the **wallet infrastructure layer**:

1. **Wallet Creation**  - `imperium init` creates an HD wallet via OWS `createWallet()`
2. **Address Derivation**  - EVM address derived from wallet, passed to all MoonPay tools
3. **Policy Attestation**  - When you set a spending policy, it's signed with OWS (cryptographic proof the human approved it)
4. **Transaction Signing**  - Every swap/bridge goes through OWS before execution

The **custom policy engine** is built on top of OWS:
- Daily spending limits
- Per-transaction limits
- Token whitelist/blacklist
- Slippage caps
- Signed policy attestation

This ensures agents can transact autonomously, but **only within human-defined boundaries**.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript (strict mode) |
| MCP Client | `@modelcontextprotocol/sdk` |
| Wallet | `@open-wallet-standard/core` |
| CLI | `commander` |
| Display | `chalk` + `cli-table3` |
| Testing | `vitest` (26 tests) |

## Testing

```bash
npm test          # Run all 26 tests
npm run test:watch # Watch mode
```

Test coverage:
- `config.test.ts`  - Config persistence (3 tests)
- `mcp-client.test.ts`  - MCP client demo mode (5 tests)
- `policy.test.ts`  - Policy engine rules (6 tests)
- `portfolio.test.ts`  - Portfolio calculations (4 tests)
- `risk.test.ts`  - Risk scoring logic (5 tests)
- `rebalance.test.ts`  - Drift calculation and action generation (3 tests)

## Known Limitations

1. **Rebalance is single-chain only**  - Cross-chain bridges have confirmation delays that complicate atomic rebalancing
2. **OWS requires native binary**  - Supported on macOS and Linux (x64/arm64). Demo mode works everywhere.
3. **Demo mode uses fixture data**  - Real mode requires MoonPay CLI login (`moonpay login`) and a funded wallet
4. **Risk scoring is rule-based**  - Transparent and deterministic, not ML-powered

## License

MIT
