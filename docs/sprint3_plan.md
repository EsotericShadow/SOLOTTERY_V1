# Solana Weekly Lottery - Sprint 3 Plan

**Date:** May 11, 2025

**Overall Goal for Sprint 3:** Successfully initialize the smart contract on the Devnet, integrate the frontend with the live smart contract, conduct thorough end-to-end testing, and prepare for a potential user review.

## Building on Sprint 2 Outcomes:

Sprint 2 saw significant progress in frontend development using mock data. However, the primary blocker was the inability to initialize the smart contract on the Devnet due to persistent TypeScript errors. Sprint 3 will prioritize resolving this blocker and then proceed with full system integration and testing.

## Key Focus Areas for Sprint 3:

1.  **Smart Contract Testnet Initialization (High Priority):**
    *   **Task 3.1.1:** Implement Alternative Approach for Initialization: Alice (Smart Contract Developer), with support from Frank (DevOps), will focus on the primary recommended alternative from `alternative_testnet_deployment_approaches.md`: **Leveraging the Anchor Test Framework for Initialization.**
        *   **Sub-task:** Analyze the existing `solana_lottery_contract.ts` test file.
        *   **Sub-task:** Adapt the relevant sections of the test file to create a dedicated script or modify the test to perform only the `initialize_config` instruction on Devnet with the correct parameters (admin, development fee receiver: `Ge3nRFoScsPY9RvyLEFNHJbxDbgvFk3nuaD78zbXahEn`, entry fee: `100000000` lamports).
        *   **Sub-task:** Configure the script/test to target the Devnet cluster and use the appropriate payer wallet.
        *   **Sub-task:** Execute and verify successful creation and population of the `LotteryConfig` account on Devnet.
    *   **Task 3.1.2 (Contingency):** If Task 3.1.1 fails, proceed to the secondary recommended alternative: **Minimalist Rust-Based Initialization Client.** Alice will develop a small Rust program to directly interact with the deployed smart contract on Devnet to call `initialize_config`.

2.  **Smart Contract - Post-Initialization Operations on Testnet:**
    *   **Task 3.2.1:** Start First Lottery Round: Once `LotteryConfig` is initialized, Alice will create/use a script to call the `start_new_lottery_round` instruction on Devnet, setting an appropriate `end_time` (e.g., 7 days from start).
    *   **Task 3.2.2:** Basic Interaction Testing (Scripts): Alice will (conceptually, or with minimal scripts) test other core instructions like `enter_lottery`, `draw_winner` (if a mechanism for advancing time or manual trigger is available/feasible on Devnet), and `claim_prize` to ensure basic functionality post-initialization.

3.  **Frontend - Live Data Integration:**
    *   **Task 3.3.1:** Update `solanaLotteryHooks.ts`: Bob (Frontend Developer) will update the existing hooks to fetch live data from the Devnet-deployed and initialized smart contract. This includes fetching `LotteryConfig`, current `LotteryRound` details, participants, user-specific entries, and past lottery results.
    *   **Task 3.3.2:** Replace Mock Data Usage: Bob will remove the direct usage of `mockData.ts` in `page.tsx` and other components, ensuring they now consume data via the updated hooks.
    *   **Task 3.3.3:** Implement Full `enterLottery` Functionality: Ensure the `handleEnterLottery` function in `page.tsx` correctly calls the `enterLottery` hook, which in turn interacts with the live smart contract on Devnet.
    *   **Task 3.3.4:** Implement UI for Other Interactions (if applicable): Based on Task 3.2.2, if functionality like viewing draw results or claiming prizes is exposed, Bob will ensure UI elements are in place and hooked up.

4.  **Full Integrated System Testing on Testnet:**
    *   **Task 3.4.1:** Develop Test Cases: Charlie (QA) and Dana (QA) will develop a comprehensive set of test cases for end-to-end testing on the Devnet. This includes wallet connection, entering the lottery, viewing lottery status, participant lists, past results, and (if feasible to simulate/trigger) the draw and claim process.
    *   **Task 3.4.2:** Execute Test Cases: Charlie and Dana will perform thorough testing of the integrated application on Devnet.
    *   **Task 3.4.3:** Log and Report Bugs: All issues found will be logged in the `technical_debt_log.md` or a new bug tracking document.

5.  **Bug Fixing and Refinement:**
    *   **Task 3.5.1:** Address Critical Bugs: Alice (for smart contract issues) and Bob (for frontend issues) will prioritize fixing any critical bugs identified during integrated testing.
    *   **Task 3.5.2:** General Refinements: Address any minor bugs or UI/UX refinements based on testing feedback.

6.  **Documentation and Reporting:**
    *   **Task 3.6.1:** Update Developer Logs: All team members will maintain their developer logs.
    *   **Task 3.6.2:** Update Project Log: Eve (Project Manager) will update the main `project_log.md` with Sprint 3 progress.
    *   **Task 3.6.3:** Sprint 3 Review and Report: Prepare a summary report for Sprint 3, highlighting achievements, challenges, and readiness for user review or next steps.

## Sprint 3 Deliverables (Expected):

*   Successfully initialized `LotteryConfig` and at least one active `LotteryRound` on the Solana Devnet.
*   Frontend application fully integrated with the live smart contract on Devnet, displaying real-time data.
*   Users able to connect their wallets and (at minimum) successfully execute the `enter_lottery` transaction on Devnet via the frontend.
*   A report detailing the results of integrated system testing, including any outstanding bugs.
*   Updated developer logs and project log.
*   A plan for Sprint 4 or next steps based on Sprint 3 outcomes.

## Team Responsibilities:

*   **Alice (Smart Contract Developer):** Lead on Tasks 3.1.1, 3.1.2, 3.2.1, 3.2.2. Assist with bug fixing (3.5.1).
*   **Bob (Frontend Developer):** Lead on Tasks 3.3.1, 3.3.2, 3.3.3, 3.3.4. Assist with bug fixing (3.5.1).
*   **Charlie (QA Engineer):** Lead on Tasks 3.4.1, 3.4.2, 3.4.3.
*   **Dana (QA Engineer):** Support Tasks 3.4.1, 3.4.2, 3.4.3.
*   **Eve (Project Manager):** Lead on Tasks 3.6.2, 3.6.3. Oversee sprint progress.
*   **Frank (DevOps/Build Engineer):** Support Task 3.1.1, 3.1.2. Ensure Devnet environment stability.

