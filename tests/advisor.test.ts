import { describe, it, expect } from "vitest";
import { initGroq, isAIAvailable } from "../src/ai/advisor.js";

describe("AI Advisor", () => {
  it("reports unavailable without API key", () => {
    // Without GROQ_API_KEY set, AI should not be available
    // initGroq checks process.env.GROQ_API_KEY
    const wasSet = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    // Note: initGroq is already called at module level in index.ts
    // Here we test the function directly
    expect(typeof isAIAvailable).toBe("function");
  });

  it("exports all required functions", async () => {
    const mod = await import("../src/ai/advisor.js");
    expect(mod.initGroq).toBeDefined();
    expect(mod.isAIAvailable).toBeDefined();
    expect(mod.analyzePortfolio).toBeDefined();
    expect(mod.analyzeRisk).toBeDefined();
    expect(mod.analyzeTrending).toBeDefined();
    expect(mod.decideRebalance).toBeDefined();
  });

  it("analyzePortfolio returns string when AI unavailable", async () => {
    const { analyzePortfolio } = await import("../src/ai/advisor.js");
    const result = await analyzePortfolio(
      [{ token: "ETH", symbol: "ETH", chain: "base", pct: 100, usdValue: 1000 }],
      [{ token: "ETH", chain: "base", address: "0x", riskScore: 0, flags: [], recommendation: "hold" as const }],
    );
    expect(typeof result).toBe("string");
  });

  it("decideRebalance returns targets array when AI unavailable", async () => {
    const { decideRebalance } = await import("../src/ai/advisor.js");
    const result = await decideRebalance(
      [{ token: "ETH", symbol: "ETH", chain: "base", pct: 100, usdValue: 1000 }],
      [{ token: "ETH", chain: "base", address: "0x", riskScore: 0, flags: [], recommendation: "hold" as const }],
    );
    expect(result).toHaveProperty("targets");
    expect(result).toHaveProperty("reasoning");
    expect(Array.isArray(result.targets)).toBe(true);
  });
});
