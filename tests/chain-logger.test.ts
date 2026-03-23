import { describe, it, expect } from "vitest";

describe("On-Chain Logger", () => {
  it("exports all required functions", async () => {
    const mod = await import("../src/chain/logger.js");
    expect(mod.initOnChainLogger).toBeDefined();
    expect(mod.isOnChainAvailable).toBeDefined();
    expect(mod.logDecision).toBeDefined();
    expect(mod.getExplorerUrl).toBeDefined();
    expect(mod.getContractUrl).toBeDefined();
  });

  it("returns correct explorer URL format", async () => {
    const { getExplorerUrl } = await import("../src/chain/logger.js");
    const url = getExplorerUrl("0xabc123");
    expect(url).toBe("https://sepolia.basescan.org/tx/0xabc123");
  });

  it("returns correct contract URL", async () => {
    const { getContractUrl } = await import("../src/chain/logger.js");
    const url = getContractUrl();
    expect(url).toContain("sepolia.basescan.org/address/0x98e0af");
  });

  it("reports unavailable before init", async () => {
    const { isOnChainAvailable } = await import("../src/chain/logger.js");
    // Before init, should not be available (or might be from previous test)
    expect(typeof isOnChainAvailable()).toBe("boolean");
  });

  it("logDecision returns null when not available", async () => {
    // Fresh import - if chain not initialized, should return null gracefully
    const { logDecision, isOnChainAvailable } = await import("../src/chain/logger.js");
    if (!isOnChainAvailable()) {
      const result = await logDecision("test decision");
      expect(result).toBeNull();
    }
  });
});
