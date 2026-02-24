import { network } from "hardhat";

async function main() {
  const { viem, networkName } = await network.connect();
  const client = await viem.getPublicClient();

  // ---------------- ESCROW ----------------
  console.log(`Deploying Escrow to ${networkName}...`);
  const escrow = await viem.deployContract("Escrow");
  console.log("Escrow deployed at:", escrow.address);

  // Example function call with required argument
  console.log("Calling escrow.createTrade(1)...");
  const escrowTx = await escrow.write.createTrade([1000000n]); // pass as array
  await client.waitForTransactionReceipt({ hash: escrowTx, confirmations: 1 });
  console.log("Escrow transaction confirmed!");

  // ---------------- SAVINGS PLAN ----------------
  console.log(`Deploying SavingsPlan to ${networkName}...`);
  const savings = await viem.deployContract("SavingsPlan");
  console.log("SavingsPlan deployed at:", savings.address);

  // Example function call with required argument
  console.log("Calling savings.subscribe(1000000)...");
  const savingsTx = await savings.write.subscribe([1000000n]); // bigint for amounts
  await client.waitForTransactionReceipt({ hash: savingsTx, confirmations: 1 });
  console.log("SavingsPlan transaction confirmed!");

  // ---------------- MULTI-TOKEN VAULT ----------------
  console.log(`Deploying Multi_token_vault to ${networkName}...`);
  const vault = await viem.deployContract("Multi_token_vault");
  console.log("Vault deployed at:", vault.address);

  // Example function call with required argument
  console.log("Calling vault.deposit(1000000)...");
  const vaultTx = await vault.write.deposit([1000000n]); // bigint for amounts
  await client.waitForTransactionReceipt({ hash: vaultTx, confirmations: 1 });
  console.log("Vault transaction confirmed!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
