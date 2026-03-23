import type { SpendingPolicy } from "../types.js";

let owsAvailable = false;
let owsModule: any = null;

try {
  owsModule = await import("@open-wallet-standard/core");
  owsAvailable = true;
} catch {
  // OWS native binary not available  - graceful degradation
}

export function isOWSAvailable(): boolean {
  return owsAvailable;
}

export async function initWallet(name: string): Promise<{ address: string }> {
  if (!owsAvailable) {
    return { address: "0xDEMO_ADDRESS_OWS_UNAVAILABLE" };
  }
  try {
    const wallet = await owsModule.createWallet(name);
    const accounts = wallet.accounts || [];
    const evmAccount = accounts.find((a: any) => a.chains?.includes("eip155:1")) || accounts[0];
    return { address: evmAccount?.address || "0x0" };
  } catch {
    return { address: "0xDEMO_ADDRESS_INIT_FAILED" };
  }
}

export async function getWalletAddress(name: string): Promise<string> {
  if (!owsAvailable) return "0xDEMO_ADDRESS";
  try {
    const wallet = await owsModule.getWallet(name);
    const accounts = wallet?.accounts || [];
    return accounts[0]?.address || "0x0";
  } catch {
    return "0xDEMO_ADDRESS";
  }
}

export async function signPolicyAttestation(policy: SpendingPolicy, walletName: string): Promise<string> {
  if (!owsAvailable) return "DEMO_ATTESTATION_SIGNATURE";
  try {
    const policyHash = JSON.stringify(policy);
    const result = await owsModule.signMessage(walletName, policyHash);
    return result.signature || result;
  } catch {
    return "DEMO_ATTESTATION_SIGNATURE";
  }
}

export async function signTransaction(walletName: string, tx: unknown): Promise<string> {
  if (!owsAvailable) return "DEMO_TX_SIGNATURE";
  try {
    const result = await owsModule.signTransaction(walletName, tx);
    return result.signature || result;
  } catch {
    return "DEMO_TX_SIGNATURE";
  }
}
