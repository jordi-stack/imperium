import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { McpClient } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

function loadFixture(toolName: string): unknown {
  const path = join(FIXTURES_DIR, `${toolName}.json`);
  if (!existsSync(path)) {
    throw new Error(`No fixture for tool: ${toolName}. Expected at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

class DemoMcpClient implements McpClient {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isDemo(): boolean { return true; }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // For token_check, return different risk profiles per token
    if (name === "token_check") {
      return getDemoRiskProfile(args);
    }
    return loadFixture(name);
  }
}

/** Return differentiated risk profiles so demo risk scan isn't all zeros */
function getDemoRiskProfile(args: Record<string, unknown>): unknown {
  const address = String(args.address ?? args.token ?? "").toLowerCase();

  // Known safe tokens (WETH, USDC)  - low risk
  if (address.includes("4200000000000000000000000000000000000006") ||
      address.includes("833589fcd6edb6e08f4c7c32d4f71b54bda02913")) {
    return {
      token: { address, name: "Safe Token", symbol: address.includes("4200") ? "WETH" : "USDC", chain: "base" },
      holderConcentration: { top10Percent: 8.2 },
      liquidity: { total: 173499368.73, locked: 916143.47 },
      communityNotes: [],
      risks: [],
    };
  }

  // Venice Token (VVV)  - medium risk
  if (address.includes("acfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf")) {
    return {
      token: { address, name: "Venice Token", symbol: "VVV", chain: "base" },
      holderConcentration: { top10Percent: 42.5 },
      liquidity: { total: 1534379, locked: 320000 },
      communityNotes: ["High holder concentration  - top 10 hold 42%"],
      risks: ["concentrated_supply"],
    };
  }

  // POL on Polygon  - higher risk (lower liquidity on that chain)
  if (address.includes("0000000000000000000000000000000000001010")) {
    return {
      token: { address, name: "Polygon", symbol: "POL", chain: "polygon" },
      holderConcentration: { top10Percent: 55.3 },
      liquidity: { total: 45000, locked: 5000 },
      communityNotes: ["Bridged token  - verify source chain liquidity"],
      risks: ["concentrated_holders", "low_bridge_liquidity"],
    };
  }

  // Unknown tokens  - moderate risk default
  return {
    token: { address, name: "Unknown", symbol: "???", chain: String(args.chain ?? "base") },
    holderConcentration: { top10Percent: 35.0 },
    liquidity: { total: 85000, locked: 10000 },
    communityNotes: [],
    risks: [],
  };
}

class RealMcpClient implements McpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["@moonpay/cli", "mcp"],
    });
    this.client = new Client({ name: "imperium", version: "1.0.0" });
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
  }

  isDemo(): boolean { return false; }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) throw new Error("Not connected. Call connect() first.");
    const result = await this.client.callTool({ name, arguments: args });
    const content = result.content;
    if (Array.isArray(content) && content.length > 0 && content[0].type === "text") {
      try {
        return JSON.parse(content[0].text as string);
      } catch {
        return content[0].text;
      }
    }
    return content;
  }
}

export function createMcpClient(demo: boolean): McpClient {
  return demo ? new DemoMcpClient() : new RealMcpClient();
}
