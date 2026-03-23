# Imperium

**AI-powered Multi-Chain Financial Command Center**

> An autonomous agent that monitors, protects, and rebalances your crypto portfolio across all chains. Powered by MoonPay CLI (MCP) + OpenWallet Standard + Groq AI.

**[Live Demo](https://imperium-demo.vercel.app)** | **[GitHub](https://github.com/jordi-stack/imperium)**

## Problem

Crypto portfolios are fragmented across multiple chains (Ethereum, Base, Polygon, Arbitrum). You can't see total allocation in one place, can't detect rug pulls until it's too late, and rebalancing requires hours of manual swaps across different UIs.

## Solution

Imperium is an AI financial agent that gives you a unified command center for your entire crypto portfolio:

- **MoonPay CLI** as execution layer (13 tools via real MCP protocol)
- **OpenWallet Standard** as security layer (7-chain HD wallet + policy engine)
- **Groq AI** (Llama 3.3 70B) for autonomous decision-making
- **Watch mode** for 24/7 autonomous monitoring

## Architecture

```
User (CLI / Interactive REPL / Watch Mode)
    |
    v
index.ts (command router)
    |
    +---> core/portfolio.ts  ---+
    +---> core/risk.ts       ---+                  +--> MoonPay CLI (MCP stdio)
    +---> core/rebalance.ts  ---+-- policy gate ---+
    +---> core/discovery.ts  ---+  (wallet/policy) +--> OWS Wallet (sign)
    +---> ai/advisor.ts      ---+-- Groq LLM ------+--> AI decisions
                                    |
                              ~/.imperium/config.json
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/jordi-stack/imperium.git
cd imperium && npm install

# Configure AI (optional but recommended - free)
cp .env.example .env
# Get free API key from https://console.groq.com
# Edit .env: GROQ_API_KEY=gsk_your_key_here

# Demo mode (no funds needed)
npx tsx src/index.ts --demo portfolio
npx tsx src/index.ts --demo risk scan
npx tsx src/index.ts --demo discover trending base
npx tsx src/index.ts --demo analyze          # AI analysis
npx tsx src/index.ts --demo ai-rebalance     # AI decides allocation
npx tsx src/index.ts --demo interactive      # Interactive REPL

# Autonomous monitoring
npx tsx src/index.ts --demo watch --interval 10

# Real mode (requires MoonPay CLI login)
npm install -g @moonpay/cli
moonpay login --email you@example.com
npx tsx src/index.ts discover trending base   # Live data
npx tsx src/index.ts risk check 0x4200000000000000000000000000000000000006 base

# Run tests
npm test
```

## Commands

### Portfolio
```bash
imperium portfolio              # Holdings + allocation table
imperium portfolio pnl          # Profit & loss breakdown
imperium portfolio activity base # Recent transactions
imperium portfolio buy ETH      # Fiat onramp (checkout URL)
imperium portfolio deposit      # Create multi-chain deposit link
```

### Risk Analysis
```bash
imperium risk scan              # Scan ALL holdings for risks
imperium risk check 0xABC base  # Check a specific token
```

Risk scoring is rule-based and transparent:
- Holder concentration > 50% in top 10 -> +40 risk
- Low liquidity (< $10K) -> +30 risk
- Community warnings -> +20 risk
- Score >= 70 -> SELL | 40-69 -> WATCH | < 40 -> HOLD

### AI-Powered Commands (requires GROQ_API_KEY)
```bash
imperium analyze                # AI analyzes portfolio + risk, gives recommendations
imperium ai-rebalance           # AI decides optimal target allocation
```

The AI advisor:
1. Gathers portfolio allocation and risk data
2. Sends to Groq Llama 3.3 70B for analysis
3. Returns actionable recommendations (what to sell/buy/hold and why)
4. For ai-rebalance: generates specific target allocation + preview actions

### Autonomous Watch Mode
```bash
imperium watch --interval 60    # Monitor every 60 seconds
imperium watch --interval 10    # Faster monitoring (10s)
```

Watch mode runs continuously:
1. Scans portfolio and risk every interval
2. Alerts when token risk increases (>= 70: SELL alert, >= 40: WATCH)
3. If AI is enabled, automatically analyzes and recommends actions
4. Press Ctrl+C to stop

### Rebalancing
```bash
imperium rebalance target ETH:50 USDC:50  # Set target manually
imperium rebalance preview                 # Preview drift + proposed actions
imperium rebalance execute                 # Execute swaps (policy-checked)
```

Or let AI decide:
```bash
imperium ai-rebalance           # AI sets optimal targets based on risk
imperium rebalance execute      # Execute AI-recommended targets
```

### Discovery
```bash
imperium discover trending base   # Trending tokens on chain
imperium discover whales base     # Smart money wallets (top PnL)
imperium discover search "pepe"   # Search tokens
```

### Policy Management
```bash
imperium policy show
imperium policy set --daily-limit 500 --tx-limit 200 --max-slippage 2
imperium policy set --block SCAM,RUG
imperium policy set --approve ETH,USDC,WBTC
```

### Interactive REPL
```bash
imperium interactive             # Live shell with all commands
imperium --demo interactive      # Demo mode REPL
```

### Initialization
```bash
imperium init    # Create OWS HD wallet (7 chains)
```

## MoonPay CLI Integration (13 Tools via MCP)

Connected via real MCP protocol using `@modelcontextprotocol/sdk` (stdio transport).

| # | Tool | Purpose |
|---|------|---------|
| 1 | `token_balance_list` | Portfolio holdings across chains |
| 2 | `token_retrieve` | Detailed token market data |
| 3 | `wallet_pnl_retrieve` | Profit & loss summary |
| 4 | `wallet_activity_list` | Recent transaction history |
| 5 | `buy` | Fiat to crypto onramp |
| 6 | `deposit_create` | Multi-chain deposit links |
| 7 | `token_check` | Safety scan (rug pull, liquidity, holders) |
| 8 | `token_holder_list` | Holder concentration analysis |
| 9 | `token_swap` | Execute rebalance swaps |
| 10 | `token_bridge` | Cross-chain bridges |
| 11 | `token_trending_list` | Trending tokens per chain |
| 12 | `wallet_discover` | Smart money wallets by PnL |
| 13 | `token_search` | Search tokens by name/symbol |

## OpenWallet Standard Integration

Real HD wallet creation via `@open-wallet-standard/core` (7 chains):

```
imperium init
  eip155:1    0x626ffe49082354d6fdaa2fE0174fEa5d13ece395
  solana      B3NpS4M2XiUTtrVmmbJGMjwcPshaxTM4HSAyMNRzic8o
  bitcoin     bc1qsuufhre7zy5wk2cc4q9398lfvtetraxxvgu2cp
  cosmos      cosmos17dxe8y9cm83f8qxagnlyhdsnw2lhrd6kh0qatr
  tron        TNRFrdgkvZBdMLDyfNrc3PvwM7Dr4a8ZDy
  ton         UQDNHuxNR4XTprtscDTLiAWOSLAE1ykN...
  filecoin    f1ioptesd67642qg6wtrz75iqwq6zsamanzpxjq6a
```

Custom policy engine built on top of OWS:
- Daily spending limits + per-transaction caps
- Token whitelist/blacklist
- Slippage guards
- OWS-signed policy attestation (cryptographic proof human approved)

## AI Integration (Groq)

Imperium uses **Groq Llama 3.3 70B** for real AI decision-making:

- **Portfolio analysis**: AI evaluates risk exposure, concentration, and recommends specific actions
- **Rebalance advisor**: AI determines optimal target allocation based on risk scores
- **Watch mode alerts**: AI provides context when risk alerts trigger
- **Free API**: Groq offers free tier at https://console.groq.com

```bash
# Example AI output:
$ imperium analyze

Portfolio Health Assessment:
The portfolio is moderately diversified, but compromised by high-risk
allocations to VVV and POL (46.1% of total value).

Top Risk Concern:
POL risk 75/100 - concentrated holders, moderate liquidity.

Recommended Action:
Sell 100% of POL ($1280) and allocate to WETH and USDC
to reduce risk and increase stability.
```

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript (strict mode) |
| AI | Groq SDK (Llama 3.3 70B) |
| MCP Client | `@modelcontextprotocol/sdk` |
| Wallet | `@open-wallet-standard/core` |
| CLI | `commander` + `chalk` + `cli-table3` |
| Config | `dotenv` |
| Testing | `vitest` (31 tests) |

## Testing

```bash
npm test          # Run all 31 tests
npm run test:watch
```

Tests cover: MCP client, portfolio calculations, risk scoring, rebalance drift, policy enforcement, integration workflows.

## Environment Variables

```bash
# .env
GROQ_API_KEY=gsk_...     # Free from https://console.groq.com
MOONPAY_WALLET=imperium  # MoonPay wallet name
DEFAULT_CHAIN=base       # Default blockchain
```

## Known Limitations

1. **Demo mode uses fixture data** - Real mode requires MoonPay CLI login and funded wallet
2. **OWS requires native binary** - Supported on macOS and Linux (x64/arm64)
3. **Risk scoring is rule-based** - AI enhances but doesn't replace deterministic scoring
4. **Swap/bridge requires funds** - Read-only operations (trending, whales, risk check) work without funds

## Built For

**The Synthesis** - a 14-day hackathon where AI agents and humans build together as equals.

- Track: MoonPay CLI Agents + OpenWallet Standard + Synthesis Open Track
- Agent: Imperium (ERC-8004 on Base Mainnet)
- Builder: Jordi Alter + Claude Opus 4.6

## License

MIT
