import { describe, it, expect } from "vitest";
import { createMcpClient } from "../src/mcp/client.js";
import { PortfolioService } from "../src/core/portfolio.js";
import { RiskService } from "../src/core/risk.js";
import { RebalanceService, calculateDrift, generateActions } from "../src/core/rebalance.js";
import { DiscoveryService } from "../src/core/discovery.js";
import { PolicyEngine } from "../src/wallet/policy.js";
import { getDefaultPolicy } from "../src/utils/config.js";

describe("Integration: Full Workflow", () => {
  const client = createMcpClient(true);

  it("portfolio → risk scan → rebalance preview → execute", async () => {
    await client.connect();

    // 1. Get portfolio
    const portfolio = new PortfolioService(client);
    const holdings = await portfolio.getHoldings();
    expect(holdings.length).toBeGreaterThan(0);

    // 2. Get allocation
    const allocation = await portfolio.getAllocation();
    expect(allocation.length).toBe(holdings.length);

    // 3. Risk scan
    const risk = new RiskService(client);
    const reports = await risk.scanPortfolio(holdings);
    expect(reports.length).toBe(holdings.length);

    // 4. Rebalance preview
    const targets = [{ token: "ETH", pct: 50 }, { token: "USDC", pct: 50 }];
    const drift = calculateDrift(allocation, targets);
    const actions = generateActions(drift, allocation);
    expect(drift.length).toBeGreaterThan(0);

    // 5. Execute with policy
    const policy = new PolicyEngine({ ...getDefaultPolicy(), dailyLimit: 50000, perTransactionLimit: 50000 });
    const rebalance = new RebalanceService(client, policy);
    const results = await rebalance.execute(actions);
    for (const r of results) {
      expect(r.success).toBe(true);
    }

    await client.disconnect();
  });

  it("discovery: trending + smart money", async () => {
    await client.connect();
    const discovery = new DiscoveryService(client);

    const trending = await discovery.getTrending("base");
    expect(trending.length).toBeGreaterThan(0);
    expect(trending[0]).toHaveProperty("symbol");

    const whales = await discovery.getSmartMoney("base");
    expect(whales.length).toBeGreaterThan(0);
    expect(whales[0]).toHaveProperty("pnl");

    await client.disconnect();
  });

  it("policy blocks excessive spending", async () => {
    await client.connect();
    const policy = new PolicyEngine({ ...getDefaultPolicy(), dailyLimit: 100, perTransactionLimit: 50 });
    const rebalance = new RebalanceService(client, policy);

    const bigAction = [{
      type: "swap" as const,
      from: { token: "ETH", chain: "base", amount: "1000" },
      to: { token: "USDC", chain: "base" },
      reason: "test",
      estimatedUsd: 1000,
    }];

    const results = await rebalance.execute(bigAction);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("per-transaction limit");

    await client.disconnect();
  });
});
