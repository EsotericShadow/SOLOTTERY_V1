import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { SolanaLotteryContract } from "../target/types/solana_lottery_contract"; // Anchor generated types for the contract
import { assert, expect } from "chai"; // Assertion library for tests
import { Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey, SYSVAR_SLOT_HASHES_PUBKEY } from "@solana/web3.js";

// Test suite for the Solana Lottery Contract
describe("solana_lottery_contract", () => {
  // Configure the client to use the local cluster by default, or environment override.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get the program instance from the workspace.
  // `anchor.workspace.SolanaLotteryContract` refers to the program defined in Anchor.toml and compiled.
  const program = anchor.workspace.SolanaLotteryContract as Program<SolanaLotteryContract>;

  // --- Test Keypairs ---
  // These keypairs are generated for testing purposes to simulate different users and accounts.
  const admin = Keypair.generate(); // Simulates the lottery administrator.
  const devFeeReceiver = Keypair.generate(); // Simulates the account that receives development fees.
  const participant1 = Keypair.generate(); // Simulates the first lottery participant.
  const participant2 = Keypair.generate(); // Simulates the second lottery participant.
  const participant3 = Keypair.generate();
  const participant4 = Keypair.generate();
  const participant5 = Keypair.generate();
  const participant6 = Keypair.generate(); // Additional participant for specific tests.

  // --- PDAs and Bumps ---
  // Derive the Program Derived Address (PDA) for the LotteryConfig account.
  // The seeds must match those defined in the smart contract.
  const [lotteryConfigPDA, lotteryConfigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("lottery_config")], // Seed: b"lottery_config"
    program.programId
  );

  // Variables to store the current lottery round ID and its PDA details.
  // These will be updated as new rounds are started in the tests.
  let currentLotteryRoundId = new anchor.BN(0);
  let lotteryRoundPDA: PublicKey;
  let lotteryRoundBump: number;

  /**
   * Helper function to derive the PDA for a LotteryRound account given its ID.
   * @param {anchor.BN} roundId - The ID of the lottery round.
   * @returns {Promise<[PublicKey, number]>} A promise that resolves to the PDA and its bump seed.
   */
  async function findLotteryRoundPDA(roundId: anchor.BN): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("lottery_round"), roundId.toBuffer("le", 8)], // Seeds: b"lottery_round" and roundId (as 8-byte little-endian buffer)
      program.programId
    );
  }

  /**
   * Helper function to airdrop SOL to a specified public key.
   * This is necessary to fund accounts for transaction fees and rent.
   * @param {PublicKey} publicKey - The public key of the account to receive SOL.
   * @param {number} amount - The amount of SOL to airdrop.
   */
  async function airdropSol(publicKey: PublicKey, amount: number) {
    const theLamports = amount * LAMPORTS_PER_SOL; // Convert SOL to lamports.
    console.log(`Requesting airdrop of ${amount} SOL (${theLamports} lamports) to ${publicKey.toBase58()}`);
    const signature = await provider.connection.requestAirdrop(publicKey, theLamports);
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
    }, "confirmed");
    console.log(`Airdrop successful. Signature: ${signature}`);
  }

  // --- Before Hook ---
  // This block runs once before any tests in the suite.
  // It airdrops SOL to all necessary test accounts.
  before(async () => {
    console.log("Starting pre-test airdrops...");
    await airdropSol(admin.publicKey, 5); // Admin needs SOL for deploying/initializing config and rounds.
    await airdropSol(participant1.publicKey, 2); // Participants need SOL for entry fees and transaction fees.
    await airdropSol(participant2.publicKey, 2);
    await airdropSol(participant3.publicKey, 2);
    await airdropSol(participant4.publicKey, 2);
    await airdropSol(participant5.publicKey, 2);
    await airdropSol(participant6.publicKey, 2);
    await airdropSol(devFeeReceiver.publicKey, 1); // Dev fee receiver needs to exist, airdrop ensures it has rent exemption if needed.
    console.log("Airdrops completed.");
  });

  // --- Test Cases ---

  it("Is initialized!", async () => {
    console.log("Test: Initialize Lottery Config");
    const entryFeeLamports = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // Set entry fee to 0.1 SOL.

    // Call the `initializeConfig` instruction.
    const tx = await program.methods
      .initializeConfig(devFeeReceiver.publicKey, entryFeeLamports)
      .accounts({
        lotteryConfig: lotteryConfigPDA,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId, // System program is required for account creation.
      })
      .signers([admin]) // The admin keypair must sign to authorize the instruction.
      .rpc(); // Send the transaction and await confirmation.
    console.log("InitializeConfig transaction signature:", tx);

    // Fetch the created LotteryConfig account from the blockchain.
    const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);

    // Assertions to verify the state of the initialized account.
    assert.ok(configAccount.adminKey.equals(admin.publicKey), "Admin key mismatch");
    assert.ok(configAccount.devFeeReceiver.equals(devFeeReceiver.publicKey), "Dev fee receiver mismatch");
    assert.ok(configAccount.entryFeeLamports.eq(entryFeeLamports), "Entry fee mismatch");
    assert.strictEqual(configAccount.isPaused, false, "Lottery should not be paused initially");
    assert.ok(configAccount.currentLotteryRoundId.eqn(0), "Initial round ID should be 0");
    assert.strictEqual(configAccount.bump, lotteryConfigBump, "Stored bump does not match derived bump");
    console.log("LotteryConfig initialized successfully.");
  });

  it("Updates config!", async () => {
    console.log("Test: Update Lottery Config");
    const newDevFeeReceiver = Keypair.generate();
    const newEntryFeeLamports = new anchor.BN(0.2 * LAMPORTS_PER_SOL); // New entry fee: 0.2 SOL.
    const newIsPaused = true; // New pause status: true.
    await airdropSol(newDevFeeReceiver.publicKey, 0.1); // Fund the new dev fee receiver.

    // Call `updateConfig` with new values.
    await program.methods
      .updateConfig(newDevFeeReceiver.publicKey, newEntryFeeLamports, newIsPaused)
      .accounts({ lotteryConfig: lotteryConfigPDA, admin: admin.publicKey })
      .signers([admin])
      .rpc();
    
    let configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
    // Verify updated values.
    assert.ok(configAccount.devFeeReceiver.equals(newDevFeeReceiver.publicKey), "Updated dev fee receiver mismatch");
    assert.ok(configAccount.entryFeeLamports.eq(newEntryFeeLamports), "Updated entry fee mismatch");
    assert.strictEqual(configAccount.isPaused, newIsPaused, "Updated pause status mismatch");
    console.log("LotteryConfig updated with new values.");

    // Call `updateConfig` again to set `isPaused` back to false for subsequent tests.
    // Passing `null` for optional parameters means those fields will not be updated.
    await program.methods
      .updateConfig(null, null, false) 
      .accounts({ lotteryConfig: lotteryConfigPDA, admin: admin.publicKey })
      .signers([admin])
      .rpc();
    configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
    assert.strictEqual(configAccount.isPaused, false, "Lottery should be unpaused for further tests");
    console.log("LotteryConfig unpaused.");
  });

  it("Starts a new lottery round!", async () => {
    console.log("Test: Start New Lottery Round");
    currentLotteryRoundId = new anchor.BN(1); // Expecting the first round to have ID 1.
    [lotteryRoundPDA, lotteryRoundBump] = await findLotteryRoundPDA(currentLotteryRoundId);
    const drawTimestampOffsetSeconds = new anchor.BN(3600); // Set draw time to 1 hour from now.

    // Call `startNewLotteryRound`.
    // Note: The `next_round_id_arg` is now part of the method signature in the Rust code.
    // It must match the `currentLotteryRoundId` being initiated.
    await program.methods
      .startNewLotteryRound(drawTimestampOffsetSeconds, currentLotteryRoundId) 
      .accounts({
        lotteryConfig: lotteryConfigPDA,
        lotteryRound: lotteryRoundPDA,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log(`Lottery Round ${currentLotteryRoundId} started.`);

    const roundAccount = await program.account.lotteryRound.fetch(lotteryRoundPDA);
    const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);

    // Verify the state of the new round and the updated config.
    assert.ok(roundAccount.roundId.eq(currentLotteryRoundId), "Round ID mismatch");
    assert.ok(configAccount.currentLotteryRoundId.eq(currentLotteryRoundId), "Config current round ID mismatch");
    assert.isTrue(roundAccount.isActive, "Round should be active");
    assert.isFalse(roundAccount.winnersDrawn, "Winners should not be drawn yet");
    assert.isFalse(roundAccount.prizesDistributed, "Prizes should not be distributed yet");
    assert.ok(roundAccount.totalPotLamports.eqn(0), "Initial pot should be 0");
    assert.lengthOf(roundAccount.participants, 0, "Initial participants list should be empty");
    console.log("New lottery round state verified.");
  });

  it("Allows participants to enter lottery!", async () => {
    console.log("Test: Participants Enter Lottery (Round 1)");
    // Ensure we are using Round 1 PDA, which was set in the previous test.
    expect(lotteryRoundPDA, "LotteryRoundPDA for round 1 should be set").to.not.be.undefined;

    const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
    const entryFee = configAccount.entryFeeLamports;

    const participantsToEnter = [participant1, participant2, participant3, participant4, participant5];
    let expectedPot = new anchor.BN(0);

    for (const p of participantsToEnter) {
      console.log(`Participant ${p.publicKey.toBase58()} entering...`);
      await program.methods
        .enterLottery()
        .accounts({
          lotteryConfig: lotteryConfigPDA,
          lotteryRound: lotteryRoundPDA, // Use the PDA for the current round (Round 1)
          participant: p.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([p])
        .rpc();
      expectedPot = expectedPot.add(entryFee);
    }
    console.log("All 5 participants entered Round 1.");

    const roundAccount = await program.account.lotteryRound.fetch(lotteryRoundPDA);
    assert.lengthOf(roundAccount.participants, 5, "Participant count mismatch");
    assert.ok(roundAccount.totalPotLamports.eq(expectedPot), "Total pot mismatch");
    participantsToEnter.forEach(p => {
      assert.isTrue(roundAccount.participants.some(rp => rp.equals(p.publicKey)), `Participant ${p.publicKey.toBase58()} not found in list`);
    });
    console.log("Participant entries and pot verified for Round 1.");

    // Test entering again (should fail).
    console.log("Test: Attempting to enter twice (should fail)");
    try {
      await program.methods
        .enterLottery()
        .accounts({
          lotteryConfig: lotteryConfigPDA,
          lotteryRound: lotteryRoundPDA,
          participant: participant1.publicKey, // participant1 tries to enter again
          systemProgram: SystemProgram.programId,
        })
        .signers([participant1])
        .rpc();
      assert.fail("Should have failed: participant already entered");
    } catch (err) {
      // Check if the error message or code matches the expected error (ParticipantAlreadyEntered).
      // Anchor wraps errors, so the actual error might be nested.
      console.log("Caught expected error for double entry:", err.message);
      assert.include(err.toString(), "ParticipantAlreadyEntered", "Error message mismatch for double entry");
    }
  });

  // Note on testing `conduct_draw` and `distribute_prizes`:
  // These tests require careful management of time (draw_timestamp) and on-chain state.
  // For `conduct_draw`, the `draw_timestamp` must be in the past.
  // For `distribute_prizes`, winners must have been drawn.
  // The original test creates a new, short round (Round 2) specifically for these tests to manage time.

  it("Conducts the draw!", async () => {
    console.log("Test: Conduct Draw (New Round - Round 2)");
    // Start a new round (Round 2) with a very short draw duration for testing conduct_draw.
    currentLotteryRoundId = new anchor.BN(2);
    const [shortDrawLotteryRoundPDA, shortDrawLotteryRoundBump] = await findLotteryRoundPDA(currentLotteryRoundId);
    const shortDrawOffsetSeconds = new anchor.BN(2); // Set draw time to 2 seconds from now.

    console.log(`Starting Round ${currentLotteryRoundId} with a ${shortDrawOffsetSeconds}s draw offset.`);
    await program.methods
      .startNewLotteryRound(shortDrawOffsetSeconds, currentLotteryRoundId)
      .accounts({ 
        lotteryConfig: lotteryConfigPDA, 
        lotteryRound: shortDrawLotteryRoundPDA, 
        admin: admin.publicKey, 
        systemProgram: SystemProgram.programId 
      })
      .signers([admin])
      .rpc();
    
    // Have 5 participants enter this new short round.
    const participantsForShortDraw = [participant1, participant2, participant3, participant4, participant5]; // Re-using keypairs for simplicity
    console.log("Participants entering short draw round...");
    for (const p of participantsForShortDraw) {
      await program.methods
        .enterLottery()
        .accounts({ 
          lotteryConfig: lotteryConfigPDA, 
          lotteryRound: shortDrawLotteryRoundPDA, 
          participant: p.publicKey, 
          systemProgram: SystemProgram.programId 
        })
        .signers([p])
        .rpc();
    }
    console.log("Participants entered short draw round.");

    console.log(`Waiting for ${shortDrawOffsetSeconds.toNumber() + 1} seconds for draw time to pass...`);
    await new Promise(resolve => setTimeout(resolve, (shortDrawOffsetSeconds.toNumber() + 1) * 1000)); // Wait for draw time to pass.

    console.log("Attempting to conduct draw...");
    await program.methods
      .conductDraw()
      .accounts({
        lotteryConfig: lotteryConfigPDA,
        lotteryRound: shortDrawLotteryRoundPDA,
        slotHashes: SYSVAR_SLOT_HASHES_PUBKEY, // SlotHashes sysvar is required for randomness.
      })
      .rpc();
    console.log("ConductDraw transaction successful.");

    const roundAccountAfterDraw = await program.account.lotteryRound.fetch(shortDrawLotteryRoundPDA);
    // Verify state after draw.
    assert.isTrue(roundAccountAfterDraw.winnersDrawn, "Winners should be marked as drawn");
    assert.isFalse(roundAccountAfterDraw.isActive, "Round should be inactive after draw");
    assert.isNotNull(roundAccountAfterDraw.mainWinner, "Main winner should be set");
    assert.lengthOf(roundAccountAfterDraw.otherWinners, 4, "Should be 4 other winners");
    assert.isNotNull(roundAccountAfterDraw.randomnessSeed, "Randomness seed should be set");

    // Ensure winners are from the participant list and are unique.
    const allWinners = [roundAccountAfterDraw.mainWinner!, ...roundAccountAfterDraw.otherWinners]; // Use non-null assertion as we checked isNotNull
    const participantKeys = participantsForShortDraw.map(p => p.publicKey.toBase58());
    allWinners.forEach(winner => {
        assert.isTrue(participantKeys.includes(winner.toBase58()), `Winner ${winner.toBase58()} not in participant list`);
    });
    const uniqueWinners = new Set(allWinners.map(w => w.toBase58()));
    assert.equal(uniqueWinners.size, 5, "Winners are not unique");
    console.log("Draw conducted and winners verified.");
  });

  it("Distributes prizes!", async () => {
    console.log("Test: Distribute Prizes (Round 2)");
    // This test depends on the state from the `conduct_draw` test for Round 2.
    const roundIdForPrize = new anchor.BN(2);
    const [prizeRoundPDA, _] = await findLotteryRoundPDA(roundIdForPrize);

    const roundAccount = await program.account.lotteryRound.fetch(prizeRoundPDA);
    const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
    
    assert.isTrue(roundAccount.winnersDrawn, "Winners must be drawn before distributing prizes");
    assert.isFalse(roundAccount.prizesDistributed, "Prizes should not be distributed yet");

    const mainWinner = roundAccount.mainWinner!;
    const otherWinners = roundAccount.otherWinners;

    // Get initial balances to verify distribution amounts.
    const devFeeReceiverInitialBalance = await provider.connection.getBalance(devFeeReceiver.publicKey);
    const mainWinnerInitialBalance = await provider.connection.getBalance(mainWinner);
    const otherWinnerInitialBalances = await Promise.all(otherWinners.map(ow => provider.connection.getBalance(ow)));
    const lotteryRoundInitialBalance = await provider.connection.getBalance(prizeRoundPDA);
    console.log(`Initial balances: DevFeeReceiver=${devFeeReceiverInitialBalance}, MainWinner=${mainWinnerInitialBalance}, LotteryRoundPDA=${lotteryRoundInitialBalance}`);

    // Prepare `remainingAccounts` for the `distributePrizes` instruction.
    // These must be in the order: Main Winner, Other Winner 1, ..., Other Winner 4.
    const prizeWinnerAccounts = [
        { pubkey: mainWinner, isSigner: false, isWritable: true },
        ...otherWinners.map(ow => ({ pubkey: ow, isSigner: false, isWritable: true }))
    ];

    console.log("Attempting to distribute prizes...");
    await program.methods
        .distributePrizes()
        .accounts({
            lotteryConfig: lotteryConfigPDA,
            lotteryRound: prizeRoundPDA,
            devFeeReceiver: devFeeReceiver.publicKey, 
        })
        .remainingAccounts(prizeWinnerAccounts) // Pass winner accounts.
        .rpc();
    console.log("DistributePrizes transaction successful.");

    const roundAccountAfterDistro = await program.account.lotteryRound.fetch(prizeRoundPDA);
    assert.isTrue(roundAccountAfterDistro.prizesDistributed, "Prizes should be marked as distributed");

    // Calculate expected shares.
    const totalPot = roundAccount.totalPotLamports;
    const devShare = totalPot.mul(new anchor.BN(10)).div(new anchor.BN(100));
    const mainWinnerShare = totalPot.mul(new anchor.BN(50)).div(new anchor.BN(100));
    const otherWinnerShare = totalPot.mul(new anchor.BN(10)).div(new anchor.BN(100));

    // Verify final balances.
    const devFeeReceiverFinalBalance = await provider.connection.getBalance(devFeeReceiver.publicKey);
    const mainWinnerFinalBalance = await provider.connection.getBalance(mainWinner);
    const otherWinnerFinalBalances = await Promise.all(otherWinners.map(ow => provider.connection.getBalance(ow)));
    const lotteryRoundFinalBalance = await provider.connection.getBalance(prizeRoundPDA);
    console.log(`Final balances: DevFeeReceiver=${devFeeReceiverFinalBalance}, MainWinner=${mainWinnerFinalBalance}, LotteryRoundPDA=${lotteryRoundFinalBalance}`);


    assert.ok(new anchor.BN(devFeeReceiverFinalBalance).eq(new anchor.BN(devFeeReceiverInitialBalance).add(devShare)), 
        `Dev fee incorrect. Expected: ${new anchor.BN(devFeeReceiverInitialBalance).add(devShare)}, Got: ${devFeeReceiverFinalBalance}`);
    assert.ok(new anchor.BN(mainWinnerFinalBalance).eq(new anchor.BN(mainWinnerInitialBalance).add(mainWinnerShare)), 
        `Main winner share incorrect. Expected: ${new anchor.BN(mainWinnerInitialBalance).add(mainWinnerShare)}, Got: ${mainWinnerFinalBalance}`);
    otherWinners.forEach((ow, index) => {
        assert.ok(new anchor.BN(otherWinnerFinalBalances[index]).eq(new anchor.BN(otherWinnerInitialBalances[index]).add(otherWinnerShare)), 
            `Other winner ${index+1} (${ow.toBase58()}) share incorrect. Expected: ${new anchor.BN(otherWinnerInitialBalances[index]).add(otherWinnerShare)}, Got: ${otherWinnerFinalBalances[index]}`);
    });
    
    // The LotteryRound PDA should have its lamports reduced by the total distributed amount.
    // It will still hold rent-exempt minimum if it was created with `init`.
    // A precise check needs to account for rent, but it should be significantly less.
    const totalDistributed = devShare.add(mainWinnerShare).add(otherWinnerShare.mul(new anchor.BN(4)));
    const expectedPdaBalanceAfter = new anchor.BN(lotteryRoundInitialBalance).sub(totalDistributed);
    // Allow for small differences due to rent not being perfectly accounted for in this simple check.
    // Using a tolerance, e.g., 0.001 SOL.
    expect(lotteryRoundFinalBalance).to.be.closeTo(expectedPdaBalanceAfter.toNumber(), LAMPORTS_PER_SOL * 0.001, "LotteryRound PDA balance after distribution is not as expected");
    console.log("Prize distribution amounts verified.");
  });

  // --- Error Handling Tests ---
  // These tests verify that the contract correctly throws errors under specific conditions.
  it("Handles errors correctly", async () => {
    console.log("Test: Error Handling");

    // Test: Attempt to start a new round when the lottery is paused.
    console.log("Sub-test: Start round when paused");
    await program.methods.updateConfig(null, null, true).accounts({ lotteryConfig: lotteryConfigPDA, admin: admin.publicKey }).signers([admin]).rpc(); // Pause lottery
    try {
        const roundId = new anchor.BN(3); // New round ID for this test.
        const [pausedRoundPDA, _] = await findLotteryRoundPDA(roundId);
        await program.methods.startNewLotteryRound(new anchor.BN(10), roundId).accounts({ lotteryConfig: lotteryConfigPDA, lotteryRound: pausedRoundPDA, admin: admin.publicKey, systemProgram: SystemProgram.programId }).signers([admin]).rpc();
        assert.fail("Should not have been able to start a round when lottery is paused");
    } catch (err) {
        console.log("Caught expected error for starting round when paused:", err.message);
        assert.include(err.toString(), "LotteryPaused", "Error message mismatch for LotteryPaused");
    }
    await program.methods.updateConfig(null, null, false).accounts({ lotteryConfig: lotteryConfigPDA, admin: admin.publicKey }).signers([admin]).rpc(); // Unpause for subsequent tests.

    // Test: Attempt to enter a round that is not active (e.g., after draw has been conducted).
    // Use Round 2, for which the draw was conducted in a previous test.
    console.log("Sub-test: Enter inactive round");
    const roundIdForInactiveTest = new anchor.BN(2);
    const [inactiveRoundPDA, __] = await findLotteryRoundPDA(roundIdForInactiveTest);
    try {
        await program.methods.enterLottery().accounts({ lotteryConfig: lotteryConfigPDA, lotteryRound: inactiveRoundPDA, participant: participant6.publicKey, systemProgram: SystemProgram.programId }).signers([participant6]).rpc();
        assert.fail("Should not have been able to enter an inactive round (after draw)");
    } catch (err) {
        console.log("Caught expected error for entering inactive round:", err.message);
        assert.include(err.toString(), "LotteryRoundNotActive", "Error message mismatch for LotteryRoundNotActive");
    }

    // Test: Attempt to conduct a draw with not enough participants.
    console.log("Sub-test: Conduct draw with insufficient participants");
    const roundIdForNotEnoughP = new anchor.BN(4); // New round ID for this test.
    const [notEnoughParticipantsRoundPDA, ___] = await findLotteryRoundPDA(roundIdForNotEnoughP);
    // Start a new round.
    await program.methods.startNewLotteryRound(new anchor.BN(5), roundIdForNotEnoughP).accounts({ lotteryConfig: lotteryConfigPDA, lotteryRound: notEnoughParticipantsRoundPDA, admin: admin.publicKey, systemProgram: SystemProgram.programId }).signers([admin]).rpc();
    // Only have 1 participant enter (less than the required 5).
    await program.methods.enterLottery().accounts({ lotteryConfig: lotteryConfigPDA, lotteryRound: notEnoughParticipantsRoundPDA, participant: participant1.publicKey, systemProgram: SystemProgram.programId }).signers([participant1]).rpc();
    
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for draw time to pass.
    try {
        await program.methods.conductDraw().accounts({ lotteryConfig: lotteryConfigPDA, lotteryRound: notEnoughParticipantsRoundPDA, slotHashes: SYSVAR_SLOT_HASHES_PUBKEY }).rpc();
        assert.fail("Should not have been able to conduct draw with insufficient participants");
    } catch (err) {
        console.log("Caught expected error for insufficient participants:", err.message);
        assert.include(err.toString(), "NotEnoughParticipants", "Error message mismatch for NotEnoughParticipants");
    }
    console.log("Error handling tests completed.");
  });
});

