## Frontend Live Data Integration Plan

**Objective:** Integrate the Next.js frontend application with the testnet-deployed `solana_lottery_contract` to use live blockchain data, replacing all mock data and enabling real user interactions.

**Developer Responsible:** Bob (Dev 2 - Frontend), with support from Alice (Dev 1 - Smart Contract)

**Prerequisites:**

1.  **Smart Contract Deployed to Testnet:** The `solana_lottery_contract` must be successfully deployed to a Solana testnet (e.g., Devnet), and its Program ID must be available. (Refer to `smart_contract_testnet_deployment_plan.md`).
2.  **Smart Contract Initialized:** The `LotteryConfig` account must be initialized on the testnet, and preferably, an initial `LotteryRound` should be active for testing `enter_lottery`.
3.  **Frontend Project Setup:** The existing Next.js frontend project (`/home/ubuntu/solana_lottery_app/frontend/solana_lottery_frontend`) with wallet connection and UI components is ready.
4.  **Anchor Client & Solana Web3.js:** These libraries are already part of the frontend dependencies.

**Integration Steps:**

1.  **Update Configuration:**
    *   **Program ID:** In `/home/ubuntu/solana_lottery_app/frontend/solana_lottery_frontend/src/lib/solanaLotteryHooks.ts` (or a dedicated config file), update the `PROGRAM_ID` constant to the actual Program ID of the deployed smart contract on the testnet.
    *   **Cluster Endpoint:** Ensure the `Connection` object in `WalletContextProvider.tsx` (or wherever it's initialized) points to the correct Solana testnet cluster (e.g., `clusterApiUrl('devnet')`).

2.  **Implement Live Data Fetching in `solanaLotteryHooks.ts`:**
    *   **Fetch `LotteryConfig` Data:**
        *   Create a function `fetchLotteryConfig()`.
        *   Derive the PDA for the `LotteryConfig` account.
        *   Use `program.account.lotteryConfig.fetch()` to retrieve its data.
        *   Store and expose this data through the hook's state (e.g., `lotteryConfig`, `setLotteryConfig`).
    *   **Fetch Current `LotteryRound` Data:**
        *   Create a function `fetchCurrentLotteryRound()`.
        *   This function will depend on `lotteryConfig.currentLotteryRoundId`.
        *   Derive the PDA for the current `LotteryRound` account using the `currentLotteryRoundId`.
        *   Use `program.account.lotteryRound.fetch()` to retrieve its data.
        *   Store and expose this data (e.g., `currentRound`, `setCurrentRound`). Handle cases where no round is active.
    *   **Fetch Participant Entries for Current Round:**
        *   Create a function `fetchParticipants()`.
        *   This will likely involve fetching the `LotteryRound` account, which contains the `participants` vector.
        *   Expose the list of participants (e.g., `participants`, `setParticipants`).
    *   **Fetch Past Lottery Results:**
        *   This is more complex as it might involve iterating through past round IDs or querying historical data if stored appropriately by the smart contract (the current design stores winners in each `LotteryRound` account).
        *   Initially, this might fetch a limited number of recent past rounds if `LotteryConfig` stores a history of round IDs or if we can derive them sequentially (e.g., if `LotteryRound` PDAs are predictable based on round ID).
        *   A more robust solution might require an off-chain indexing service or a different on-chain storage pattern for historical data, which is beyond the scope of initial integration but should be noted.

3.  **Integrate Live Data into UI Components:**
    *   **`LotteryStatusCard.tsx`:**
        *   Replace mock data for pot amount, time remaining (calculate from `currentRound.endTime`), round ID, and user entries with live data from the `useSolanaLottery` hook.
        *   The "Enter Lottery" button's fee display should use `lotteryConfig.entryFee`.
    *   **`ParticipantsList.tsx`:**
        *   Replace mock participant data with the live `participants` list from the hook.
    *   **`PastLotteryResults.tsx`:**
        *   Replace mock past results with data fetched for past rounds.
    *   **`page.tsx` (Main Page):**
        *   Ensure all components receive live data props from the `useSolanaLottery` hook.
        *   Implement loading states (e.g., while fetching initial config and round data).
        *   Implement error handling and display appropriate messages if data fetching fails.

4.  **Refine Transaction Handling (`enter_lottery`):**
    *   Ensure the `enterLottery` function in `solanaLotteryHooks.ts` correctly uses the live `lotteryConfig` and `currentRound` data (e.g., for deriving PDAs, checking if the round is active, entry fee).
    *   Improve user feedback for transaction submission, confirmation, and errors using a notification system (e.g., react-hot-toast) instead of just `alert()`.

5.  **Implement Frontend Logic for Other Smart Contract Instructions (as per Sprint 2 goals):**
    *   **Admin Functions (if UI is planned for admin in this phase):**
        *   `update_config`: If an admin UI is part of this sprint, create forms and functions to call this.
        *   `start_new_lottery_round`: UI for admin to trigger a new round.
        *   `conduct_draw`: UI for admin to trigger the draw.
        *   `distribute_prizes`: UI for admin to trigger prize distribution.
        *   These will require careful handling of admin wallet authentication and authorization checks on the frontend (though primary security is on-chain).
    *   **User-Facing Functions (related to draw and results):**
        *   Displaying winner information after a draw.
        *   Updating UI dynamically when a draw occurs or prizes are distributed (may require polling or WebSocket connection if real-time updates are desired, initially polling is simpler).

6.  **Testing:**
    *   Thoroughly test all functionalities on the testnet with a real wallet (e.g., Phantom).
    *   Test the `enter_lottery` flow: connection, entry, fee deduction, participant list update (after refresh/poll).
    *   Test display of lottery config, current round status, and time remaining.
    *   Test display of past results (if implemented).
    *   Test admin functionalities if UI is built for them.
    *   Test edge cases: insufficient SOL for entry, trying to enter when a round is not active or has ended, network errors.

**Considerations:**

*   **Data Refresh Strategy:** Decide on how frequently data should be refreshed (e.g., on component mount, periodically via polling, on user action).
*   **State Management:** Ensure efficient state management for fetched data to avoid unnecessary re-renders or stale data. React Query or SWR could be considered for more advanced data fetching and caching, but basic `useState`/`useEffect` with the custom hook is the current approach.
*   **Error Handling:** Implement robust error handling for all smart contract interactions and data fetching operations, providing clear feedback to the user.
*   **User Experience (UX):** Ensure loading states are handled gracefully. Provide clear visual feedback for all operations.
*   **Security:** While the frontend doesn't hold critical keys for contract operations (user's wallet does), ensure no sensitive information is unnecessarily exposed and that all interactions with the wallet are secure.

**Deliverables:**

*   Frontend application successfully interacting with the testnet-deployed smart contract.
*   All mock data replaced with live on-chain data for core lottery functionalities.
*   Users can connect their wallet and participate in a lottery round on the testnet.
*   Documented list of integrated features and any known limitations or areas for future improvement.

