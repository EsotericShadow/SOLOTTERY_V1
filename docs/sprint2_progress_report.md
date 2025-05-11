# Sprint 2 Progress Report: Solana Weekly Lottery

**Date:** May 11, 2025

This report summarizes the progress made during Sprint 2 of the Solana Weekly Lottery application development.

## Sprint Goal Recap:

The primary goals for Sprint 2 were:
1.  Deploy the Solana smart contract to a testnet (Devnet).
2.  Initialize the smart contract on the testnet.
3.  Begin integration of the frontend with the testnet-deployed smart contract.
4.  Conduct integrated system testing.

## Achievements and Progress:

### Task 2.1: Smart Contract Testnet Deployment (COMPLETED)

Our smart contract developer, Alice, successfully completed the deployment of the `solana_lottery_contract` to the Solana Devnet.

Key activities and outcomes:
*   **Solana CLI Configuration:** The Solana CLI was successfully configured to target the Devnet environment.
*   **Deployment Keypair:** The deployment keypair (`~/.config/solana/id.json`, Public Key: `EhHBra5iixyfcf1vGvSdDKzzr2hNACNmscZ548ywiF5M`) was funded with sufficient SOL (3 SOL) via Devnet airdrops to cover deployment costs.
*   **Smart Contract Build:** The Anchor smart contract was built successfully using `anchor build`. A minor warning regarding an unused variable was noted but does not impact functionality.
*   **Anchor.toml Configuration:** The `Anchor.toml` file was updated to specify `Devnet` as the target cluster, resolving initial deployment issues.
*   **Successful Deployment:** After addressing an initial insufficient funds error, the smart contract was successfully deployed to the Devnet.
    *   **Deployed Program ID:** `58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv`
    *   **Deployment Transaction Signature:** `ZXNNnf6zEQAFniUy4JEKt32XQH64PP6oVoTWeo9ZZgc1Ljgi1bKQjZrdzrpyLfq1qz6HCd13ULjDh1Yf3trg3hg`
*   **Developer Logs:** Alice's developer log (`dev_log_alice_sprint2.md`) has been updated to reflect the completion of these sub-tasks.

### Task 2.2: Smart Contract Initialization on Testnet (IN PROGRESS)

Work has commenced on initializing the deployed smart contract on the Devnet. This involves calling the `initialize_config` instruction to set up the initial lottery parameters.

Key activities and progress:
*   **Initialization Script:** A TypeScript script (`initializeConfigScript_InitializeConfig.ts`) has been developed to interact with the deployed program and call the `initialize_config` instruction.
*   **Configuration Parameters:**
    *   Admin: `EhHBra5iixyfcf1vGvSdDKzzr2hNACNmscZ548ywiF5M` (the deployment keypair)
    *   Development Fee Receiver: `Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn` (provided by the user)
    *   Entry Fee: 0.1 SOL (100,000,000 lamports)
*   **Troubleshooting:** We are currently in the process of troubleshooting TypeScript errors within the initialization script. These errors are primarily related to ensuring the correct account names (as defined in the smart contract's IDL and Rust code) are used when calling the instruction and fetching account data. The latest understanding, based on error message analysis, is that the account should be referred to as `lotteryConfig` (camelCase) in the client-side script for both the `.accounts({})` call and when fetching the account via `program.account.lotteryConfig.fetch()`.

## Next Steps for Sprint 2:

1.  **Complete Smart Contract Initialization (Task 2.2):** Resolve the remaining TypeScript issues in the initialization script and successfully execute it on Devnet to create and verify the `LotteryConfig` account.
2.  **Start First Lottery Round (Task 2.2.3 - Optional but Recommended):** Once `LotteryConfig` is initialized, call `start_new_lottery_round` to set up the first active lottery.
3.  **Frontend Integration with Live Data (Task 2.3):** Bob will begin updating the frontend components to connect to the deployed Devnet smart contract, replacing mock data with live on-chain data. This includes fetching lottery status, participant lists, and past results, and enabling users to enter the lottery by calling the `enter_lottery` instruction on the live contract.
4.  **Integrated System Testing (Task 2.4):** Charlie and Dana will lead the testing of the integrated system on Devnet, covering the full user flow from connecting a wallet and entering the lottery to (simulated) drawing and prize distribution verification.

## Challenges Encountered:
*   Initial `anchor deploy` failures due to incorrect cluster configuration (defaulting to localnet) and insufficient SOL for deployment fees. These were resolved by updating `Anchor.toml` and airdropping additional SOL.
*   TypeScript errors in the smart contract initialization script related to account naming conventions. This is currently being addressed through careful review of error messages and the smart contract's IDL structure.

We are making steady progress and are focused on resolving the current challenges to complete the remaining Sprint 2 objectives.

