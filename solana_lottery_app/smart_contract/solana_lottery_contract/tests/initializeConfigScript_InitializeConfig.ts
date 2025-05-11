// Script to initialize the LotteryConfig on Devnet

import * as anchor from "@coral-xyz/anchor";
import { SolanaLotteryContract } from "../target/types/solana_lottery_contract";
// Explicitly use types from @solana/web3.js as much as possible, like the test file
import { Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

async function airdropSol(provider: anchor.AnchorProvider, publicKey: PublicKey, amountLamports: number) {
  try {
    console.log(`Attempting to airdrop ${amountLamports / LAMPORTS_PER_SOL} SOL to ${publicKey.toBase58()}...`);
    const signature = await provider.connection.requestAirdrop(publicKey, amountLamports);
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
    }, "confirmed");
    console.log(`Airdrop successful. Signature: ${signature}`);
    const balance = await provider.connection.getBalance(publicKey);
    console.log(`New balance for ${publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.error(`Airdrop failed for ${publicKey.toBase58()}:`, error);
    throw error; // Re-throw to stop execution if airdrop fails
  }
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Consistent with test file: uses PascalCase for workspace program name
  const program = anchor.workspace.SolanaLotteryContract as anchor.Program<SolanaLotteryContract>;

  // Generate a new admin keypair for this script execution, using Keypair from @solana/web3.js
  const adminKeypair = Keypair.generate();
  console.log("Generated new admin keypair for initialization script:", adminKeypair.publicKey.toBase58());

  // Airdrop SOL to the new admin keypair
  await airdropSol(provider, adminKeypair.publicKey, 2 * LAMPORTS_PER_SOL);

  // Use PublicKey from @solana/web3.js
  const developmentFeeReceiver = new PublicKey("Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn"); 
  const entryFeeLamports = new anchor.BN(100000000); // 0.1 SOL

  // Use PublicKey from @solana/web3.js for findProgramAddressSync
  const [lotteryConfigPDA, _lotteryConfigBump] = 
    PublicKey.findProgramAddressSync(
      [Buffer.from("lottery_config")], // Seed for the PDA as per IDL
      program.programId
    );

  console.log("Attempting to initialize LotteryConfig with PDA:", lotteryConfigPDA.toBase58());
  console.log("Admin being used (newly generated for this script):", adminKeypair.publicKey.toBase58());
  console.log("Development Fee Receiver:", developmentFeeReceiver.toBase58());
  console.log("Entry Fee (Lamports):", entryFeeLamports.toString());

  try {
    const tx = await program.methods
      .initializeConfig(
        developmentFeeReceiver, // web3.js PublicKey
        entryFeeLamports
      )
      .accounts({
        lotteryConfig: lotteryConfigPDA,        // web3.js PublicKey
        admin: adminKeypair.publicKey,          // web3.js PublicKey
        systemProgram: SystemProgram.programId, // web3.js PublicKey (from import)
      })
      .signers([adminKeypair]) // web3.js Keypair
      .rpc();

    console.log("InitializeConfig transaction signature:", tx);
    console.log("LotteryConfig PDA should now be initialized.");

    // Fetch and log the created account data for verification
    const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA); 
    console.log("--- Fetched LotteryConfig Data ---");
    // Access fields using camelCase as per previous TS error hints and common Anchor client behavior
    console.log("Admin Key:", configAccount.adminKey.toBase58()); 
    console.log("Dev Fee Receiver:", configAccount.devFeeReceiver.toBase58()); 
    console.log("Entry Fee Lamports:", configAccount.entryFeeLamports.toString()); 
    console.log("Is Paused:", configAccount.isPaused); 
    console.log("Current Lottery Round ID:", configAccount.currentLotteryRoundId.toString()); 
    console.log("Bump:", configAccount.bump);

  } catch (err) {
    console.error("ERROR during initializeConfig or fetching data:", err);
    if (err.logs) {
      console.error("Program Logs:");
      err.logs.forEach(log => console.error(log));
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Script execution failed overall:", err);
    process.exit(1);
  }
);

