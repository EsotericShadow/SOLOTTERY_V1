import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { SolanaLotteryContract } from "../target/types/solana_lottery_contract";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Script to start a new lottery round on Devnet
describe("Start New Lottery Round on Devnet", () => {
  // Configure the client to use the Devnet cluster.
  const provider = anchor.AnchorProvider.env(); // Assumes ANCHOR_PROVIDER_URL is set to Devnet RPC
  anchor.setProvider(provider);

  console.log(`Using wallet: ${provider.wallet.publicKey.toBase58()}`);

  // Program ID (replace with your deployed program ID on Devnet)
  const programId = new PublicKey("58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv");
  const program = new Program<SolanaLotteryContract>(require("../target/idl/solana_lottery_contract.json"), programId, provider);

  const adminKeypair = (provider.wallet as any).payer; // Assuming provider.wallet is a NodeWallet with a payer
  console.log(`Admin public key: ${adminKeypair.publicKey.toBase58()}`);

  // PDA for LotteryConfig
  const [lotteryConfigPDA, lotteryConfigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_config")],
    program.programId
  );
  console.log(`LotteryConfig PDA: ${lotteryConfigPDA.toBase58()}`);

  // Define the ID for the new lottery round (should be 1 if first round after init)
  // This will be determined by fetching the current_lottery_round_id from config and incrementing it.
  // For this script, we'll assume we are starting round 1.
  const newLotteryRoundId = new BN(1);

  // PDA for the new LotteryRound
  const [lotteryRoundPDA, lotteryRoundBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_round"), newLotteryRoundId.toBuffer("le", 8)],
    program.programId
  );
  console.log(`LotteryRound PDA for round ${newLotteryRoundId.toString()}: ${lotteryRoundPDA.toBase58()}`);

  // Define the end time for the lottery round (e.g., 7 days from now)
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;
  const drawTimestampOffsetSeconds = new BN(sevenDaysInSeconds);
  // const nowInSeconds = Math.floor(Date.now() / 1000);
  // const drawTimestamp = new BN(nowInSeconds + sevenDaysInSeconds);

  it("Starts a new lottery round on Devnet", async () => {
    console.log("Attempting to start a new lottery round...");
    console.log(`  Admin: ${adminKeypair.publicKey.toBase58()}`);
    console.log(`  Lottery Config PDA: ${lotteryConfigPDA.toBase58()}`);
    console.log(`  New Lottery Round ID: ${newLotteryRoundId.toString()}`);
    console.log(`  New Lottery Round PDA: ${lotteryRoundPDA.toBase58()}`);
    console.log(`  Draw Timestamp Offset (seconds): ${drawTimestampOffsetSeconds.toString()}`);

    try {
      // Fetch current config to ensure it's initialized and to potentially get current round ID
      const configAccountBefore = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
      console.log(`Current lottery round ID from config: ${configAccountBefore.currentLotteryRoundId.toString()}`);
      if (configAccountBefore.isPaused) {
        throw new Error("Lottery is paused, cannot start a new round.");
      }
      // Ideally, newLotteryRoundId should be configAccountBefore.currentLotteryRoundId + 1
      // For this script, we are hardcoding it to 1, assuming init set it to 0.
      // A more robust script would fetch currentLotteryRoundId and use it to derive the next one.

      const txSignature = await program.methods
        .startNewLotteryRound(drawTimestampOffsetSeconds)
        .accounts({
          lotteryConfig: lotteryConfigPDA,
          lotteryRound: lotteryRoundPDA,
          admin: adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKeypair])
        .rpc();

      console.log("StartNewLotteryRound transaction signature", txSignature);
      console.log(`Transaction successful! View on Solana Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

      // Fetch and log the created account data for verification
      console.log("Fetching LotteryRound account data...");
      const roundAccount = await program.account.lotteryRound.fetch(lotteryRoundPDA);
      console.log("Fetched LotteryRound Data:");
      console.log(`  Round ID: ${roundAccount.roundId.toString()}`);
      console.log(`  Is Active: ${roundAccount.isActive}`);
      console.log(`  Draw Timestamp: ${new Date(roundAccount.drawTimestamp.toNumber() * 1000).toISOString()}`);
      console.log(`  Total Pot (Lamports): ${roundAccount.totalPotLamports.toString()}`);
      console.log(`  Participant Count: ${roundAccount.participants.length}`);

      console.log("Fetching updated LotteryConfig account data...");
      const configAccountAfter = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
      console.log("Fetched LotteryConfig Data After Starting Round:");
      console.log(`  Current Lottery Round ID: ${configAccountAfter.currentLotteryRoundId.toString()}`);

      // Assertions
      if (!roundAccount.roundId.eq(newLotteryRoundId)) {
        throw new Error("Round ID mismatch in LotteryRound account!");
      }
      if (!roundAccount.isActive) {
        throw new Error("LotteryRound should be active!");
      }
      if (!configAccountAfter.currentLotteryRoundId.eq(newLotteryRoundId)) {
        throw new Error("CurrentLotteryRoundId mismatch in LotteryConfig account!");
      }

      console.log("New lottery round started and verified successfully on Devnet!");

    } catch (error) {
      console.error("Failed to start new lottery round on Devnet:", error);
      if (error.logs) {
        console.error("Transaction Logs:");
        error.logs.forEach(log => console.error(log));
      }
      throw error; // Re-throw to fail the test if an error occurs
    }
  });
});

