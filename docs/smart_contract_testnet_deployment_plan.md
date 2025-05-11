## Solana Smart Contract Testnet Deployment Plan

**Objective:** Deploy the `solana_lottery_contract` to a Solana testnet (e.g., Devnet) to enable live testing and frontend integration.

**Developer Responsible:** Alice (Dev 1 - Smart Contract), with support from Frank (Dev 6 - DevOps)

**Prerequisites:**

1.  **Completed Smart Contract Code:** The smart contract code in `/home/ubuntu/solana_lottery_app/smart_contract/solana_lottery_contract/programs/solana_lottery_contract/src/lib.rs` must be finalized and compile successfully.
2.  **Anchor CLI Installed:** Ensure Anchor CLI is correctly installed and configured in the development environment.
3.  **Solana CLI Installed:** Ensure Solana CLI is installed and configured.
4.  **Testnet SOL:** Obtain sufficient testnet SOL (e.g., from a Devnet faucet) for the deployment account to cover deployment costs and transaction fees for initialization.
5.  **Deployment Keypair:** A secure Solana keypair must be available and funded for deploying and managing the smart contract. This keypair will be the initial authority for the `LotteryConfig`.

**Deployment Steps:**

1.  **Environment Configuration:**
    *   Set the Solana CLI configuration to target the chosen testnet (e.g., `solana config set --url https://api.devnet.solana.com`).
    *   Verify the configuration (`solana config get`).
    *   Ensure the deployment keypair is correctly configured in the Solana CLI or specified in Anchor.toml.

2.  **Build the Smart Contract:**
    *   Navigate to the smart contract directory: `cd /home/ubuntu/solana_lottery_app/smart_contract/solana_lottery_contract`.
    *   Execute `anchor build`. This will compile the Rust code into a BPF bytecode file (`.so` file) suitable for deployment. Address any compilation errors.
    *   Note the program ID of the built contract. This will be needed for the frontend integration.

3.  **Deploy the Smart Contract:**
    *   Execute `anchor deploy` (or `solana program deploy <path_to_so_file> --keypair <path_to_deployer_keypair>`).
    *   Monitor the deployment process for success. Note the deployed Program ID if it differs from the build-time ID (though Anchor typically manages this).

4.  **Initialize Smart Contract State (LotteryConfig):**
    *   Once deployed, the `initialize_config` instruction must be called to set up the initial `LotteryConfig` account.
    *   This will require a script or a command-line call using the Anchor CLI or a custom client.
    *   The script should:
        *   Connect to the testnet.
        *   Use the deployment keypair (or a designated admin keypair) as the signer.
        *   Provide the necessary parameters for `LotteryConfig` (admin address, development fee receiver, entry fee, etc.).
        *   Invoke the `initialize_config` instruction on the deployed program.
    *   Verify that the `LotteryConfig` account is created on-chain with the correct data.

5.  **Initial Lottery Round Setup (Optional but Recommended for Testing):**
    *   After `LotteryConfig` is initialized, call the `start_new_lottery_round` instruction to create the first active lottery round.
    *   This will allow immediate testing of the `enter_lottery` functionality from the frontend.
    *   This also requires a script or CLI call, signed by the admin.

6.  **Verification:**
    *   Use Solana Explorer (for the chosen testnet) to verify the deployed program and the created accounts (`LotteryConfig`, `LotteryRound`).
    *   Check transaction history for deployment and initialization.

7.  **Documentation:**
    *   Record the deployed Program ID.
    *   Record the public key of the `LotteryConfig` account.
    *   Record the public key of the initial `LotteryRound` account (if created).
    *   Document any specific testnet faucet usage or keypair details (securely, if necessary).

**Considerations:**

*   **Deployment Costs:** Be mindful of SOL costs for deployment and account creation on the testnet.
*   **Program Upgradability:** By default, Solana programs deployed via `solana program deploy` are immutable. If upgrades are anticipated, consider using a BPF Upgradeable Loader and manage upgrade authority carefully. Anchor handles this with `anchor upgrade` if the program was deployed with an upgradeable buffer.
*   **Testnet Stability:** Testnets can sometimes be unstable or undergo resets. Be prepared for potential issues.
*   **Security:** Even on a testnet, handle keypairs securely. Do not commit private keys to version control.
*   **Error Handling:** Have a plan to debug any deployment or initialization errors. Check transaction details on the explorer.

**Deliverables:**

*   Deployed `solana_lottery_contract` Program ID on the testnet.
*   Public key of the initialized `LotteryConfig` account.
*   Confirmation that the contract is operational on the testnet.

