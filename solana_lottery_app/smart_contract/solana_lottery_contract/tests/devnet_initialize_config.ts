import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { SolanaLotteryContract } from "../target/types/solana_lottery_contract";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Script to initialize LotteryConfig on Devnet
describe("Initialize Lottery Config on Devnet", () => {
  // Configure the client to use the Devnet cluster.
  const provider = anchor.AnchorProvider.env(); // Assumes ANCHOR_PROVIDER_URL is set to Devnet RPC
  // Alternatively, explicitly set the provider:
  // const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  // const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(Keypair.generate()), { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Log the provider's wallet public key to ensure it's what we expect
  console.log(`Using wallet: ${provider.wallet.publicKey.toBase58()}`);

  // Program ID (replace with your deployed program ID on Devnet)
  const programId = new PublicKey("58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv");
  const program = new Program<SolanaLotteryContract>(require("../target/idl/solana_lottery_contract.json"), programId, provider);

  // Admin keypair - this keypair will pay for transactions and be the admin.
  // For Devnet, we can use the provider's wallet or generate a new one and airdrop SOL.
  // Using provider.wallet as admin for simplicity, assuming it has SOL.
  const adminKeypair = (provider.wallet as any).payer; // Assuming provider.wallet is a NodeWallet with a payer
  console.log(`Admin public key: ${adminKeypair.publicKey.toBase58()}`);

  // Development Fee Receiver Public Key (replace with actual public key)
  const developmentFeeReceiverPubKey = new PublicKey("Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn");

  // Entry Fee in Lamports (e.g., 0.1 SOL)
  const entryFeeLamports = new BN(0.1 * LAMPORTS_PER_SOL);

  // PDA for LotteryConfig
  const [lotteryConfigPDA, lotteryConfigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_config")],
    program.programId
  );
  console.log(`LotteryConfig PDA: ${lotteryConfigPDA.toBase58()}`);

  // Helper function to airdrop SOL if needed (e.g., if using a new keypair for admin)
  async function ensureSol(publicKey: PublicKey, amountSol: number = 1) {
    const balance = await provider.connection.getBalance(publicKey);
    console.log(`Current balance of ${publicKey.toBase58()} is ${balance / LAMPORTS_PER_SOL} SOL`);
    if (balance < amountSol * LAMPORTS_PER_SOL * 0.5) { // If balance is less than 0.5 SOL (for a 1 SOL request)
      console.log(`Airdropping ${amountSol} SOL to ${publicKey.toBase58()}...`);
      try {
        constLamports = amountSol * LAMPORTS_PER_SOL;
        const signature = await provider.connection.requestAirdrop(publicKey, theLamports);
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature,
        }, "confirmed");
        console.log(`Airdrop successful. New balance: ${await provider.connection.getBalance(publicKey) / LAMPORTS_PER_SOL} SOL`);
      } catch (error) {
        console.error(`Airdrop failed for ${publicKey.toBase58()}:`, error);
        throw error;
      }
    } else {
      console.log(`Sufficient SOL balance available for ${publicKey.toBase58()}.`);
    }
  }

  it("Initializes the LotteryConfig on Devnet", async () => {
    // Ensure admin has SOL
    // If adminKeypair is provider.wallet.payer, it should ideally have SOL already.
    // If it's a new Keypair, you MUST airdrop.
    // Let's assume provider.wallet.payer has SOL. If not, this will fail.
    // You can uncomment the line below if you are using a fresh keypair for admin.
    // await ensureSol(adminKeypair.publicKey, 2); // Airdrop 2 SOL to admin if needed

    console.log("Attempting to initialize LotteryConfig...");
    console.log(`  Admin: ${adminKeypair.publicKey.toBase58()}`);
    console.log(`  Development Fee Receiver: ${developmentFeeReceiverPubKey.toBase58()}`);
    console.log(`  Entry Fee (Lamports): ${entryFeeLamports.toString()}`);
    console.log(`  Lottery Config PDA: ${lotteryConfigPDA.toBase58()}`);

    try {
      const txSignature = await program.methods
        .initializeConfig(developmentFeeReceiverPubKey, entryFeeLamports)
        .accounts({
          lotteryConfig: lotteryConfigPDA,
          admin: adminKeypair.publicKey, // The admin authority
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKeypair]) // The admin keypair needs to sign
        .rpc();

      console.log("InitializeConfig transaction signature", txSignature);
      console.log(`Transaction successful! View on Solana Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

      // Fetch and log the created account data for verification
      console.log("Fetching LotteryConfig account data...");
      const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
      
      console.log("Fetched LotteryConfig Data:");
      console.log(`  Admin Key: ${configAccount.adminKey.toBase58()}`);
      console.log(`  Development Fee Receiver: ${configAccount.devFeeReceiver.toBase58()}`);
      console.log(`  Entry Fee Lamports: ${configAccount.entryFeeLamports.toString()}`);
      console.log(`  Is Paused: ${configAccount.isPaused}`);
      console.log(`  Current Lottery Round ID: ${configAccount.currentLotteryRoundId.toString()}`);
      console.log(`  Bump: ${configAccount.bump}`);

      // Assertions (optional, but good for automated verification)
      if (configAccount.adminKey.toBase58() !== adminKeypair.publicKey.toBase58()) {
        throw new Error("Admin key mismatch!");
      }
      if (configAccount.devFeeReceiver.toBase58() !== developmentFeeReceiverPubKey.toBase58()) {
        throw new Error("Dev fee receiver mismatch!");
      }
      if (!configAccount.entryFeeLamports.eq(entryFeeLamports)) {
        throw new Error("Entry fee mismatch!");
      }
      if (configAccount.isPaused !== false) {
        throw new Error("Pause status mismatch!");
      }
       if (!configAccount.currentLotteryRoundId.eqn(0)) {
        throw new Error("Current lottery round ID mismatch!");
      }

      console.log("LotteryConfig initialized and verified successfully on Devnet!");

    } catch (error) {
      console.error("Failed to initialize LotteryConfig on Devnet:", error);
      if (error.logs) {
        console.error("Transaction Logs:");
        error.logs.forEach(log => console.error(log));
      }
      throw error; // Re-throw to fail the test if an error occurs
    }
  });
});

