#!/usr/bin/env node
import { Command } from "commander";
import { createMcpClient } from "./mcp/client.js";
import { PortfolioService } from "./core/portfolio.js";
import { RiskService } from "./core/risk.js";
import { RebalanceService, calculateDrift, generateActions } from "./core/rebalance.js";
import { DiscoveryService } from "./core/discovery.js";
import { PolicyEngine } from "./wallet/policy.js";
import { loadConfig, saveConfig, getConfigPath, getDefaultPolicy } from "./utils/config.js";
import { initWallet, isOWSAvailable, signPolicyAttestation } from "./wallet/ows.js";
import * as display from "./utils/display.js";
import type { TargetAllocation } from "./types.js";

const program = new Command();

program
  .name("imperium")
  .description("⚔  Imperium  - Multi-Chain Financial Command Center\n\n   Powered by MoonPay CLI (MCP) + OpenWallet Standard")
  .version("1.0.0")
  .option("--demo", "Run in demo mode (fixture data, no real funds needed)");

// === INIT ===
program
  .command("init")
  .description("Initialize Imperium  - create OWS wallet and config")
  .action(async () => {
    display.header("Imperium Init");
    const config = loadConfig();
    if (config.walletName) {
      display.warn(`Already initialized. Wallet: ${config.walletName}, Address: ${config.evmAddress}`);
      return;
    }
    console.log(`  OWS Available: ${isOWSAvailable() ? "yes" : "no (using demo wallet)"}`);
    const { address } = await initWallet("imperium-agent");
    config.walletName = "imperium-agent";
    config.evmAddress = address;
    saveConfig(config);
    display.success(`Wallet created! Address: ${address}`);
    display.success(`Config saved to ${getConfigPath()}`);
  });

// === PORTFOLIO ===
const portfolio = program.command("portfolio").description("View portfolio holdings, allocation, PnL");

portfolio
  .command("view")
  .description("Show holdings and allocation")
  .argument("[chain]", "Filter by chain")
  .action(async (chain?: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header("Portfolio");
    const allocation = await service.getAllocation();
    display.showAllocation(allocation);
    await client.disconnect();
  });

portfolio
  .command("pnl")
  .description("Profit & loss summary")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header("Profit & Loss");
    const pnl = await service.getPnL();
    display.showPnL(pnl);
    await client.disconnect();
  });

portfolio
  .command("activity")
  .description("Recent activity")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Activity  - ${chain}`);
    const activities = await service.getActivity(chain);
    display.showActivity(activities);
    await client.disconnect();
  });

portfolio
  .command("buy")
  .description("Buy crypto with fiat (returns checkout URL)")
  .argument("<token>", "Token to buy (e.g., ETH)")
  .argument("[amount]", "Fiat amount in USD", "100")
  .action(async (token: string, amount: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Buy ${token}`);
    const result = await service.buyWithFiat(token, amount);
    console.log(`  Checkout URL: ${(result as any).checkoutUrl || JSON.stringify(result)}`);
    display.success("Open the URL in your browser to complete the purchase.");
    await client.disconnect();
  });

portfolio
  .command("deposit")
  .description("Create a multi-chain deposit link")
  .argument("[chain]", "Destination chain", "base")
  .argument("[token]", "Destination token", "USDC")
  .action(async (chain: string, token: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Deposit → ${token} on ${chain}`);
    const result = await service.createDeposit(chain, token);
    console.log(JSON.stringify(result, null, 2));
    display.success("Share the deposit addresses above. Incoming crypto auto-converts.");
    await client.disconnect();
  });

// Default: `imperium portfolio` shows view
portfolio.action(async () => {
  const client = createMcpClient(program.opts().demo);
  await client.connect();
  const service = new PortfolioService(client);
  display.header("Portfolio");
  const allocation = await service.getAllocation();
  display.showAllocation(allocation);
  await client.disconnect();
});

// === RISK ===
const risk = program.command("risk").description("Risk analysis and safety scanning");

risk
  .command("scan")
  .description("Scan all holdings for risks")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);
    display.header("Risk Scan");
    const holdings = await portfolioService.getHoldings();
    const reports = await riskService.scanPortfolio(holdings);
    display.showRiskReports(reports);
    await client.disconnect();
  });

risk
  .command("check")
  .description("Check a specific token")
  .argument("<address>", "Token address")
  .argument("<chain>", "Chain")
  .action(async (address: string, chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const riskService = new RiskService(client);
    display.header(`Risk Check  - ${address.slice(0, 10)}...`);
    const report = await riskService.checkToken(address, chain);
    display.showRiskReports([report]);
    await client.disconnect();
  });

// === REBALANCE ===
const rebalance = program.command("rebalance").description("Portfolio rebalancing");

rebalance
  .command("target")
  .description("Set target allocation (e.g., ETH:50 USDC:50)")
  .argument("<pairs...>", "Token:Percentage pairs")
  .action(async (pairs: string[]) => {
    display.header("Set Target Allocation");
    const targets: TargetAllocation[] = pairs.map((p) => {
      const [token, pctStr] = p.split(":");
      return { token, pct: parseFloat(pctStr) };
    });
    const totalPct = targets.reduce((s, t) => s + t.pct, 0);
    if (Math.abs(totalPct - 100) > 0.1) {
      display.error(`Allocation must sum to 100%. Got ${totalPct}%`);
      return;
    }
    const config = loadConfig();
    config.targetAllocation = targets;
    saveConfig(config);
    for (const t of targets) {
      console.log(`  ${t.token}: ${t.pct}%`);
    }
    display.success("Target allocation saved.");
  });

rebalance
  .command("preview")
  .description("Preview rebalance actions (dry run)")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const config = loadConfig();
    if (!config.targetAllocation.length) {
      display.error("No target set. Run: imperium rebalance target ETH:50 USDC:50");
      return;
    }
    const portfolioService = new PortfolioService(client);
    display.header("Rebalance Preview");
    const allocation = await portfolioService.getAllocation();
    const drift = calculateDrift(allocation, config.targetAllocation);
    display.showDrift(drift);
    const actions = generateActions(drift, allocation);
    console.log("");
    display.header("Proposed Actions");
    display.showActions(actions);
    await client.disconnect();
  });

rebalance
  .command("execute")
  .description("Execute rebalance (with policy check)")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const config = loadConfig();
    if (!config.targetAllocation.length) {
      display.error("No target set. Run: imperium rebalance target ETH:50 USDC:50");
      return;
    }
    const policyEngine = new PolicyEngine(config.policy);
    const portfolioService = new PortfolioService(client);
    const rebalanceService = new RebalanceService(client, policyEngine);

    display.header("Rebalance Execute");
    const allocation = await portfolioService.getAllocation();
    const actions = await rebalanceService.preview(allocation, config.targetAllocation);

    if (actions.length === 0) {
      display.success("Portfolio is balanced. No actions needed.");
      return;
    }

    console.log(`  Executing ${actions.length} action(s)...`);
    const results = await rebalanceService.execute(actions);
    for (const r of results) {
      if (r.success) {
        display.success(`Swapped ${r.action.from.token} → ${r.action.to.token} | tx: ${r.txHash?.slice(0, 16)}...`);
      } else {
        display.error(`Failed: ${r.action.from.token} → ${r.action.to.token} | ${r.error}`);
      }
    }
    await client.disconnect();
  });

// === DISCOVER ===
const discover = program.command("discover").description("Discover trending tokens and smart money");

discover
  .command("trending")
  .description("Trending tokens on a chain")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Trending  - ${chain}`);
    const tokens = await service.getTrending(chain);
    display.showTrending(tokens);
    await client.disconnect();
  });

discover
  .command("whales")
  .description("Top wallets by PnL (smart money)")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Smart Money  - ${chain}`);
    const wallets = await service.getSmartMoney(chain);
    display.showSmartMoney(wallets);
    await client.disconnect();
  });

discover
  .command("search")
  .description("Search tokens")
  .argument("<query>", "Search query")
  .action(async (query: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Search: "${query}"`);
    const results = await service.search(query);
    console.log(JSON.stringify(results, null, 2));
    await client.disconnect();
  });

// === POLICY ===
const policy = program.command("policy").description("Manage spending policies");

policy
  .command("show")
  .description("Show current spending policy")
  .action(() => {
    display.header("Spending Policy");
    const config = loadConfig();
    display.showPolicy(config.policy);
  });

policy
  .command("set")
  .description("Update spending policy")
  .option("--daily-limit <n>", "Max USD per day", parseFloat)
  .option("--tx-limit <n>", "Max USD per transaction", parseFloat)
  .option("--max-slippage <n>", "Max slippage %", parseFloat)
  .option("--block <tokens>", "Comma-separated blocked tokens")
  .option("--approve <tokens>", "Comma-separated approved tokens")
  .action(async (opts: any) => {
    display.header("Update Policy");
    const config = loadConfig();
    if (opts.dailyLimit !== undefined) config.policy.dailyLimit = opts.dailyLimit;
    if (opts.txLimit !== undefined) config.policy.perTransactionLimit = opts.txLimit;
    if (opts.maxSlippage !== undefined) config.policy.maxSlippage = opts.maxSlippage;
    if (opts.block) config.policy.blockedTokens = opts.block.split(",");
    if (opts.approve) config.policy.approvedTokens = opts.approve.split(",");

    const attestation = await signPolicyAttestation(config.policy, config.walletName || "imperium-agent");
    config.policy.attestation = attestation;
    saveConfig(config);
    display.showPolicy(config.policy);
    display.success("Policy updated and signed.");
  });

// Default action
policy.action(() => {
  display.header("Spending Policy");
  const config = loadConfig();
  display.showPolicy(config.policy);
});

// Parse and run
program.parse();
