# Todo List

## Sprint 3: Smart Contract Refinement & Frontend Integration

### Task 3.1: Resolve Smart Contract Initialization on Devnet (Alice, Frank)

*   **Task 3.1.1: Implement Alternative Approach for Initialization (Leveraging Anchor Test Framework)**
    *   [x] 001 Analyze the `solana_lottery_contract.ts` test file to understand how `initialize_config` is called, what parameters are used, and how accounts are set up.
    *   [x] 002 Adapt the test file script to specifically target the Devnet environment. This includes ensuring the correct RPC endpoint is used, the deployed program ID (58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv) is referenced, and the `development_fee_receiver` public key (`Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn`) and `entry_fee_lamports` (e.g., 0.1 SOL = 100,000,000 lamports) are correctly passed to the `initialize_config` instruction.
    *   [x] 003 Execute the adapted script against the Devnet to perform the `initialize_config` transaction.
    *   [x] 004 Verify successful initialization by fetching the `LotteryConfig` account from Devnet and checking if its data (admin, fee receiver, entry fee, pause status, current round ID) matches the intended initialized values.
    *   [x] 005 Update Alice's developer log with the steps taken, any issues encountered, and the outcome. Notify the project manager upon successful initialization or if further issues arise.

*   **Task 3.1.2: Implement `start_new_lottery_round` Script (Alice)**
    *   [x] Prepare a script (similar to the initialization script, likely TypeScript using Anchor) to call the `start_new_lottery_round` instruction on the Devnet-deployed and initialized contract.
    *   [x] Define a suitable `end_time` for the first lottery round (e.g., 7 days from the current date/time).
    *   [x] Execute the script to start the first lottery round on Devnet.
    *   [x] Verify that the `LotteryRound` account is created and the `LotteryConfig` account's `current_lottery_round_id` is updated.

### Task 3.2: Integrate Live Smart Contract Data into Frontend (Bob)

*   [ ] **Task 3.2.1: Update Frontend Services to Fetch Data from Devnet**
    *   [ ] Modify `solanaLotteryHooks.ts` (or create new service files) to interact with the deployed smart contract on Devnet.
    *   [ ] Implement functions to fetch `LotteryConfig` data (entry fee, admin, etc.).
    *   [ ] Implement functions to fetch current `LotteryRound` data (end time, ticket count, prize pool).
    *   [ ] Implement functions to fetch participant information for the current round.
    *   [ ] Implement functions to fetch past lottery results.
*   [ ] **Task 3.2.2: Connect Frontend Components to Live Data**
    *   [ ] Update `LotteryStatusCard.tsx` to display live data from `LotteryConfig` and `LotteryRound`.
    *   [ ] Update `ParticipantsList.tsx` to display participants from the live contract.
    *   [ ] Update `PastLotteryResults.tsx` to display historical data from the live contract.
    *   [ ] Implement the `BuyTicketButton.tsx` functionality to allow users to call the `buy_ticket` instruction on the smart contract.
*   [ ] **Task 3.2.3: Implement Wallet Connection (Bob, Frank)**
    *   [ ] Integrate a Solana wallet adapter (e.g., `@solana/wallet-adapter-react`) into the frontend.
    *   [ ] Allow users to connect their Solana wallets (e.g., Phantom, Solflare).
    *   [ ] Display connected wallet address and balance.

### Task 3.3: Conduct Integrated System Testing on Devnet (Charlie)

*   [ ] **Task 3.3.1: Develop Test Cases for Devnet Integration**
    *   [ ] Define test cases covering: Config initialization, Round start, Ticket purchase, Round ending (manual trigger if needed), Winner determination (manual trigger if needed), Prize claim.
*   [ ] **Task 3.3.2: Execute Test Cases**
    *   [ ] Perform wallet connections and disconnections.
    *   [ ] Simulate multiple users buying tickets.
    *   [ ] Observe data updates on the frontend reflecting backend changes.
    *   [ ] Attempt to buy tickets with insufficient funds or after the round has ended.
*   [ ] **Task 3.3.3: Report and Triage Bugs**
    *   [ ] Document any discrepancies, errors, or unexpected behavior.
    *   [ ] Prioritize bugs and assign them for resolution.

### Task 3.4: Sprint 3 Review and Retrospective Planning (All)

*   [ ] **Task 3.4.1: Prepare Sprint 3 Demo**
*   [ ] **Task 3.4.2: Conduct Sprint Review Meeting**
*   [ ] **Task 3.4.3: Conduct Sprint Retrospective**
*   [ ] **Task 3.4.4: Plan for Sprint 4**

