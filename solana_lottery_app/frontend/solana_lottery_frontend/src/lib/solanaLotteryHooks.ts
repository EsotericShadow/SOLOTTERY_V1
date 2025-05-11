"use client"; // Directive for Next.js, indicating this module is client-side only.

import { Program, AnchorProvider, web3, BN } from "@project-serum/anchor"; // Anchor framework core components.
import { useConnection, useWallet } from "@solana/wallet-adapter-react"; // React hooks for Solana wallet interaction.
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js"; // Solana web3.js library for core Solana functionalities.
import idl from "@/idl/solana_lottery_contract.json"; // Import the Interface Definition Language (IDL) JSON file for the smart contract.
                                                 // The `@/` alias typically points to the `src` directory in Next.js projects.
                                                 // Ensure this IDL file is correctly placed and accessible.

// --- Constants ---

// The Program ID of the deployed Solana smart contract.
// This is extracted from the IDL metadata, which should be updated after each contract deployment.
const PROGRAM_ID = new PublicKey(idl.metadata.address);

// Type assertion for the IDL. Using `any` for now, but can be replaced with a generated type for better type safety.
// Tools like `anchor-ts` can generate TypeScript types from the IDL.
const typedIdl = idl as any;

// --- Interfaces ---
// These interfaces define the structure of the data fetched from the smart contract accounts.
// They should mirror the Rust struct definitions in the smart contract (`lib.rs`).

/**
 * Represents the data structure of the `LotteryConfig` account on-chain.
 */
export interface LotteryConfigData {
    adminKey: PublicKey;          // The public key of the lottery administrator.
    devFeeReceiver: PublicKey;    // The public key of the account that receives development fees.
    entryFeeLamports: BN;         // The cost of one lottery ticket in lamports (as a BigNumber).
    isPaused: boolean;            // Flag indicating if the lottery is currently paused.
    currentLotteryRoundId: BN;    // The ID of the current or most recently concluded lottery round (as a BigNumber).
    bump: number;                 // The bump seed used for PDA derivation of this account.
}

/**
 * Represents the data structure of the `LotteryRound` account on-chain.
 */
export interface LotteryRoundData {
    roundId: BN;                  // The unique identifier for this lottery round (as a BigNumber).
    // lotteryConfig: PublicKey; // Note: The Rust struct might not store a direct reference back to config PDA if derivable.
                                // If it does, uncomment and ensure type matches. For now, assuming it's not directly stored.
    isActive: boolean;            // Flag indicating if the lottery round is currently active (accepting entries).
    drawTimestamp: BN;            // Unix timestamp when the draw will occur (as a BigNumber).
    totalPotLamports: BN;         // Total lamports collected from ticket sales for this round (as a BigNumber).
    participants: PublicKey[];    // Array of public keys of participants in this round.
    winnersDrawn: boolean;        // Flag indicating if winners for this round have been drawn.
    prizesDistributed: boolean;   // Flag indicating if prizes for this round have been distributed.
    mainWinner?: PublicKey | null; // Public key of the main winner (optional, null if not drawn).
    otherWinners: PublicKey[];    // Array of public keys of other winners.
    randomnessSeed?: BN | null;    // Pseudo-random seed used for the draw (optional, null if not generated, BN might need to be [u8;32]).
                                  // Consider if BN is the correct type for a 32-byte array or if it should be `Uint8Array` or `number[]`.
    bump: number;                 // The bump seed used for PDA derivation of this account.
}

// --- Custom Hook ---

/**
 * `useSolanaLottery` is a custom React hook that provides functions to interact with the Solana Lottery smart contract.
 * It encapsulates the logic for:
 * - Establishing a connection and provider.
 * - Creating a program instance from the IDL.
 * - Fetching data from `LotteryConfig` and `LotteryRound` accounts.
 * - Sending transactions to enter the lottery.
 * - (Placeholder) Fetching past lottery results.
 */
export function useSolanaLottery() {
    const { connection } = useConnection(); // Hook to get the current Solana connection object.
    const wallet = useWallet();             // Hook to get the connected wallet's state and methods.

    /**
     * Gets an AnchorProvider instance.
     * If the wallet is connected and supports signing, it returns a provider configured with the wallet.
     * Otherwise, it returns a read-only provider (useful for fetching data without a connected wallet).
     * @returns {AnchorProvider} An AnchorProvider instance.
     */
    const getProvider = () => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            console.warn("Wallet not connected or does not support signing. Using a read-only provider.");
            // For read-only operations (like fetching data), a dummy Keypair can be used if no wallet is present.
            return new AnchorProvider(connection, new web3.Keypair(), AnchorProvider.defaultOptions()); 
        }
        // If wallet is connected, use it to create the provider for signing transactions.
        const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions());
        return provider;
    };

    /**
     * Gets an instance of the smart contract Program.
     * @param {boolean} [readOnly=false] - If true, attempts to create a read-only program instance, useful if the wallet isn't fully available for signing.
     * @returns {Program | null} An instance of the Program, or null if the provider cannot be obtained.
     */
    const getProgram = (readOnly: boolean = false) => {
        const provider = getProvider();
        if (!provider) {
            console.error("Failed to get a provider.");
            return null;
        }
        if (readOnly && (!wallet.publicKey || !wallet.signTransaction)) {
             // If explicitly requesting readOnly and wallet isn't fully capable, ensure a truly read-only setup.
            const readOnlyWallet = { 
                publicKey: web3.Keypair.generate().publicKey, // Dummy public key
                signTransaction: async (tx: web3.Transaction) => tx, 
                signAllTransactions: async (txs: web3.Transaction[]) => txs 
            };
            const readOnlyProvider = new AnchorProvider(connection, readOnlyWallet as any, AnchorProvider.defaultOptions());
            return new Program(typedIdl, PROGRAM_ID, readOnlyProvider);
        }
        return new Program(typedIdl, PROGRAM_ID, provider);
    };

    /**
     * Fetches the `LotteryConfig` account data from the blockchain.
     * @returns {Promise<LotteryConfigData | null>} The lottery configuration data, or null if an error occurs.
     */
    const fetchLotteryConfig = async (): Promise<LotteryConfigData | null> => {
        const program = getProgram(true); // Use a read-only program instance for fetching.
        if (!program) return null;

        try {
            // Derive the Program Derived Address (PDA) for the LotteryConfig account.
            // The seeds must match those defined in the smart contract (`InitializeConfig` accounts struct).
            const [lotteryConfigPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("lottery_config")], // Seed: b"lottery_config"
                program.programId
            );
            console.log("Fetching LotteryConfig from PDA:", lotteryConfigPDA.toBase58());
            const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
            return configAccount as LotteryConfigData; // Cast to the defined interface.
        } catch (error) {
            console.error("Error fetching lottery config:", error);
            return null;
        }
    };

    /**
     * Fetches the current `LotteryRound` account data from the blockchain.
     * It first fetches the `LotteryConfig` to get the `currentLotteryRoundId`.
     * @returns {Promise<LotteryRoundData | null>} The current lottery round data, or null if an error occurs or no active round.
     */
    const fetchCurrentLotteryRound = async (): Promise<LotteryRoundData | null> => {
        const program = getProgram(true); // Use a read-only program instance.
        if (!program) return null;

        try {
            const config = await fetchLotteryConfig();
            if (!config) {
                console.log("Lottery config not found, cannot fetch current round.");
                return null;
            }
            if (config.currentLotteryRoundId.eqn(0)) { // Check if currentLotteryRoundId is zero (BN.eqn(0)).
                console.log("No active lottery round (currentLotteryRoundId is 0).");
                return null;
            }
            const currentLotteryRoundId = config.currentLotteryRoundId;
            
            // Derive the PDA for the current LotteryRound account.
            // Seeds: b"lottery_round" and the current_lottery_round_id (as little-endian bytes).
            const [lotteryRoundPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("lottery_round"), currentLotteryRoundId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );
            console.log(`Fetching LotteryRound PDA: ${lotteryRoundPDA.toBase58()} for round ID: ${currentLotteryRoundId.toString()}`);
            const roundAccount = await program.account.lotteryRound.fetch(lotteryRoundPDA);
            return roundAccount as LotteryRoundData; // Cast to the defined interface.
        } catch (error) {
            console.error("Error fetching current lottery round:", error);
            return null;
        }
    };

    /**
     * Sends a transaction to enter the current active lottery round.
     * Requires a connected wallet with signing capabilities.
     * @returns {Promise<string | null>} The transaction signature if successful, or null if an error occurs.
     */
    const enterLottery = async () => {
        const program = getProgram(); // Get a program instance potentially capable of signing.
        const provider = getProvider();

        if (!program || !provider || !wallet.publicKey || !wallet.signTransaction) {
            console.error("Program, provider, or wallet (publicKey/signTransaction) is not available for `enterLottery`.");
            alert("Please connect your wallet first and ensure it supports transaction signing.");
            return null;
        }

        try {
            // Derive the LotteryConfig PDA.
            const [lotteryConfigPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("lottery_config")],
                program.programId
            );

            // Fetch the current lottery round ID from the config account.
            // This is necessary to derive the correct LotteryRound PDA.
            const configAccount = await program.account.lotteryConfig.fetch(lotteryConfigPDA);
            const currentLotteryRoundId = configAccount.currentLotteryRoundId as BN;

            if (currentLotteryRoundId.eqn(0)) {
                alert("No active lottery round to enter. The current round ID is 0.");
                console.log("No active lottery round to enter. currentLotteryRoundId is 0.");
                return null;
            }
            
            // Derive the current LotteryRound PDA.
            const [lotteryRoundPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("lottery_round"), currentLotteryRoundId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            console.log("Attempting to enter lottery for round ID:", currentLotteryRoundId.toString());
            console.log("Using Lottery Config PDA:", lotteryConfigPDA.toBase58());
            console.log("Using Lottery Round PDA:", lotteryRoundPDA.toBase58());
            console.log("Participant (signer) Pubkey:", wallet.publicKey.toBase58());

            // Call the `enterLottery` instruction on the smart contract.
            const txSignature = await program.methods
                .enterLottery()
                .accounts({
                    lotteryConfig: lotteryConfigPDA,
                    lotteryRound: lotteryRoundPDA,
                    participant: wallet.publicKey,       // The connected wallet's public key is the participant.
                    systemProgram: SystemProgram.programId, // Required for SOL transfer CPI.
                })
                .rpc(); // Send the transaction and await confirmation.
            
            console.log("Enter lottery transaction successful. Signature:", txSignature);
            alert(`Successfully entered lottery! Transaction ID: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error entering lottery:", error);
            const err = error as any; // Cast to any to access potential properties like message/logs.
            let errorMsg = "Failed to enter lottery.";
            if (err.message) {
                errorMsg += ` Error: ${err.message}`;
            }
            // Anchor often includes detailed logs in the error object which can be very helpful for debugging.
            if (err.logs && Array.isArray(err.logs)) {
                errorMsg += `\nProgram Logs:\n${err.logs.join("\n")}`;
            }
            alert(errorMsg);
            return null;
        }
    };

    /**
     * Placeholder function for fetching past lottery results.
     * Implementing this would require more complex logic, potentially involving:
     * - An on-chain mechanism to store/query past round IDs or results.
     * - Off-chain indexing services if iterating through many past rounds is too slow/costly on-chain.
     * @returns {Promise<any[]>} An empty array for now.
     */
    const fetchPastLotteryResults = async () => {
        console.warn("fetchPastLotteryResults is not yet implemented. This feature requires an indexing solution or a method to iterate through past round PDAs.");
        // Example: If you had a way to get all past round IDs, you could fetch them one by one.
        // However, without knowing all past round IDs, this is not straightforward.
        return []; // Return an empty array as a placeholder.
    };

    // Expose the functions for use in UI components.
    return { 
        enterLottery, 
        fetchLotteryConfig, 
        fetchCurrentLotteryRound, 
        fetchPastLotteryResults, 
        getProgram, // Exposing getProgram and getProvider might be useful for advanced direct interactions.
        getProvider 
    };
}

