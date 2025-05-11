# Developer Log - Alice - Sprint 2

**Sprint Goal:** Testnet Deployment, Frontend Integration & System Testing (Smart Contract Focus)

**Date:** May 11, 2025

## Task 2.1: Smart Contract Testnet Deployment (with Frank)

### Sub-task 2.1.1: Configure Solana CLI for Testnet (Devnet)
- [x] Set Solana CLI to Devnet.
- [x] Verify configuration. (RPC URL: https://api.devnet.solana.com, Keypair Path: /home/ubuntu/.config/solana/id.json)

### Sub-task 2.1.2: Secure and fund deployment keypair with testnet SOL
- [x] (Conceptual) Ensure a keypair is available and funded on Devnet. (`~/.config/solana/id.json` is the designated deployer keypair, public key: EhHBra5iixyfcf1vGvSdDKzzr2hNACNmscZ548ywiF5M, funded with 3 SOL via airdrop).

### Sub-task 2.1.3: Build the smart contract (`anchor build`)
- [x] Navigate to contract directory.
- [x] Run `anchor build`.
- [x] Document build outcome. (Build successful, 1 warning for unused variable)

### Sub-task 2.1.4: Deploy the smart contract to Testnet (`anchor deploy`)
- [x] Run `anchor deploy` (after updating Anchor.toml to target Devnet).
- [x] Document deployment outcome. (Deployment successful after resolving insufficient funds error by airdropping more SOL).

### Sub-task 2.1.5: Record deployed Program ID
- [x] Note the Program ID from the deployment output. (Program ID: 58Tp7nzzrUej7RTdWGSavSdGp1YHArexN19pYFnTABxv)

## Task 2.2: Smart Contract Initialization on Testnet

### Sub-task 2.2.1: Develop/use script to call `initialize_config`
- [ ] Prepare TypeScript script to call `initialize_config`.
- [ ] Define parameters for `initialize_config` (admin: EhHBra5iixyfcf1vGvSdDKzzr2hNACNmscZ548ywiF5M, dev_fee_receiver: <placeholder_address_frank_will_provide>, entry_fee_lamports: 100000000 (0.1 SOL), pause_status: false).
- [ ] Execute script against Devnet.

### Sub-task 2.2.2: Verify `LotteryConfig` account creation and data
- [ ] Use Solana Explorer or a script to fetch and verify `LotteryConfig` data.

### Sub-task 2.2.3: (Optional) Call `start_new_lottery_round`
- [ ] Prepare TypeScript script to call `start_new_lottery_round`.
- [ ] Execute script against Devnet.
- [ ] Verify `LotteryRound` account creation.

