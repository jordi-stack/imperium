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
./imp --demo portfolio
./imp --demo risk scan
./imp --demo discover trending base
./imp --demo analyze          # AI analysis
./imp --demo ai-rebalance     # AI decides allocation
./imp --demo interactive      # Interactive REPL

# Autonomous monitoring
./imp --demo watch --interval 10

# Real mode (live MoonPay data)
npm install -g @moonpay/cli
moonpay login --email you@example.com
# Open link in browser, get verification code
mp verify --email you@example.com --code 123456
moonpay wallet create --name my-wallet

# Set wallet name in .env
# MOONPAY_WALLET=my-wallet

# Now use without --demo (live data, no funds needed for read-only)
./imp discover trending base        # Live trending tokens
./imp discover whales base          # Real smart money wallets
./imp risk check 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 base  # Check USDC safety

# Swap/bridge requires funded wallet (send ETH to your wallet address)
# ./imp rebalance execute           # Execute swaps via MoonPay CLI

# Run tests
npm test
```

## Commands

### Portfolio
```bash
./imp portfolio              # Holdings + allocation table
./imp portfolio pnl          # Profit & loss breakdown
./imp portfolio activity base # Recent transactions
./imp portfolio buy ETH      # Fiat onramp (checkout URL)
./imp portfolio deposit      # Create multi-chain deposit link
```

### Risk Analysis
```bash
./imp risk scan              # Scan ALL holdings for risks
./imp risk check 0xABC base  # Check a specific token
```

Risk scoring is rule-based and transparent:
- Holder concentration > 50% in top 10 -> +40 risk
- Low liquidity (< $10K) -> +30 risk
- Community warnings -> +20 risk
- Score >= 70 -> SELL | 40-69 -> WATCH | < 40 -> HOLD

### AI-Powered Commands (requires GROQ_API_KEY)
```bash
./imp analyze                # AI analyzes portfolio + risk, gives recommendations
./imp ai-rebalance           # AI decides optimal target allocation
```

The AI advisor:
1. Gathers portfolio allocation and risk data
2. Sends to Groq Llama 3.3 70B for analysis
3. Returns actionable recommendations (what to sell/buy/hold and why)
4. For ai-rebalance: generates specific target allocation + preview actions

### Autonomous Watch Mode
```bash
./imp watch --interval 60    # Monitor every 60 seconds
./imp watch --interval 10    # Faster monitoring (10s)
```

Watch mode is a **fully autonomous agent loop**:
1. Scans portfolio and risk every interval
2. Alerts when token risk increases (>= 70: SELL alert, >= 40: WATCH)
3. AI analyzes alerts and decides optimal rebalance targets
4. Generates swap/bridge actions and checks against spending policy
5. Executes approved actions via MoonPay CLI (or dry-run in demo mode)
6. Logs every decision on-chain (Base Sepolia)
7. Press Ctrl+C to stop

### Rebalancing
```bash
./imp rebalance target ETH:50 USDC:50  # Set target manually
./imp rebalance preview                 # Preview drift + proposed actions
./imp rebalance execute                 # Execute swaps (policy-checked)
```

Or let AI decide:
```bash
./imp ai-rebalance           # AI sets optimal targets based on risk
./imp rebalance execute      # Execute AI-recommended targets
```

### Discovery
```bash
./imp discover trending base   # Trending tokens on chain
./imp discover whales base     # Smart money wallets (top PnL)
./imp discover search "pepe"   # Search tokens
```

### Policy Management
```bash
./imp policy show
./imp policy set --daily-limit 500 --tx-limit 200 --max-slippage 2
./imp policy set --block SCAM,RUG
./imp policy set --approve ETH,USDC,WBTC
```

### Interactive REPL
```bash
./imp interactive             # Live shell with all commands
./imp --demo interactive      # Demo mode REPL
```

### Initialization
```bash
./imp init    # Create OWS HD wallet (7 chains)
```

## MoonPay CLI Integration (13 Tools via MCP)

Connected via real MCP protocol using `@modelcontextprotocol/sdk` (stdio transport). **11/13 tools verified live** against MoonPay CLI. Only `token_swap` and `token_bridge` require a funded wallet.

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

Imperium uses a **two-layer wallet architecture** for defense in depth:

- **OWS (cold layer)**: Identity, policy signing, on-chain transaction signing via `@open-wallet-standard/core`
- **MoonPay CLI (hot layer)**: Trade execution, balance queries, market data

This separation ensures the policy-signing key (OWS) is never exposed to the execution layer (MoonPay). OWS signs policy attestations that gate what MoonPay can execute.

Real HD wallet creation via OWS (7 chains):

```
./imp init
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
- On-chain decision logging via OWS wallet (Base Sepolia)

## AI Integration (Groq)

Imperium uses **Groq Llama 3.3 70B** for real AI decision-making:

- **Portfolio analysis**: AI evaluates risk exposure, concentration, and recommends specific actions
- **Rebalance advisor**: AI determines optimal target allocation based on risk scores
- **Watch mode alerts**: AI provides context when risk alerts trigger
- **Free API**: Groq offers free tier at https://console.groq.com

```bash
# Example AI output:
$ ./imp analyze

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
| Testing | `vitest` (40 tests) |

## Testing

```bash
npm test          # Run all 40 tests
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

## On-Chain Decision Log (Base Sepolia)

Every AI decision is hashed and committed on-chain as immutable proof of agent activity.

**Contract:** [`0x98e0af1509c50a3b7fe34f3ea405fc182c512c78`](https://sepolia.basescan.org/address/0x98e0af1509c50a3b7fe34f3ea405fc182c512c78)

```solidity
contract ImperiumDecisionLog {
    string public constant AGENT_NAME = "Imperium";
    event Decision(address indexed agent, bytes32 indexed hash, string action, uint256 timestamp);
    function log(bytes32 hash, string calldata action) external;
}
```

| Decision | Action | TX |
|----------|--------|----|
| #1 | Agent deployed and initialized | [`0x4e1aec...`](https://sepolia.basescan.org/tx/0x4e1aec4afa1643e8a876b63b8376efdbc689846b37f0af13e4f9ef71d7567897) |
| #2 | AI risk alert: POL 75/100, recommend SELL | [`0x2ea113...`](https://sepolia.basescan.org/tx/0x2ea113fc3a6d72112d7be2bdf004108881364762da7153971497249410cad3a9) |
| #3 | AI rebalance: ETH:50 USDC:40 VVV:10 POL:0 | [`0x37dac4...`](https://sepolia.basescan.org/tx/0x37dac435cbcd995d180aae68f887320ef3d454f46bc36fe9d8bf5507fb9cd1f9) |

Log more decisions:
```bash
npx tsx scripts/log-decision.ts "AI-ALERT: token risk changed"
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
- On-chain: [DecisionLog on Base Sepolia](https://sepolia.basescan.org/address/0x98e0af1509c50a3b7fe34f3ea405fc182c512c78)
- Builder: Jordi Alter + Claude Opus 4.6

## License

MIT
