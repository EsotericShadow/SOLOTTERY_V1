# Smart Contract Initialization Challenges

This document outlines the persistent challenges encountered during the attempts to initialize the Solana Weekly Lottery smart contract on the Devnet as part of Sprint 2 (Task 2.2).

## Persistent Error

The primary and recurring error encountered during the execution of the `initializeConfigScript_InitializeConfig.ts` script is a TypeScript type error:

```
TSError: ⨯ Unable to compile TypeScript:
tests/initializeConfigScript_InitializeConfig.ts(XX,Y): error TS2353: Object literal may only specify known properties, and 'lotteryConfig' does not exist in type 'ResolvedAccounts<{ name: "lotteryConfig"; writable: true; pda: { seeds: [{ kind: "const"; value: [...]; }]; }; } | { name: "admin"; writable: true; signer: true; } | { ...; }>
```

This error indicates a mismatch between the account structure expected by the Anchor/TypeScript client and what is being provided in the `.accounts({...})` call within the script, specifically concerning the `lotteryConfig` account.

## Troubleshooting Steps Undertaken

A variety of systematic troubleshooting steps were taken to resolve this issue, none ofwhich have definitively fixed the problem:

1.  **IDL Examination:** The `solana_lottery_contract.json` IDL file was reviewed to determine the correct names and structures for instructions and accounts.
2.  **Naming Convention Variations:** Multiple naming conventions (camelCase: `lotteryConfig`, snake_case: `lottery_config`, PascalCase: `LotteryConfig`) were attempted for the account key within the `.accounts({...})` object in the script.
3.  **Program Access Variations:** Different casing conventions for accessing the program via `anchor.workspace` (e.g., `anchor.workspace.SolanaLotteryContract` vs. `anchor.workspace.solanaLotteryContract`) were tested.
4.  **Admin Keypair Management:**
    *   Initially used `provider.wallet` as the admin.
    *   Later switched to generating a new `Keypair` within the script (`adminKeypair = Keypair.generate();`) and airdropping SOL to it to ensure a clean, funded signer.
5.  **Smart Contract Rebuilds:**
    *   `anchor build` was run multiple times to ensure the latest smart contract compilation and IDL/type generation.
    *   `anchor clean` was used to remove old build artifacts, followed by `anchor build` for a completely fresh build.
6.  **TypeScript Environment:**
    *   `ts-node` was installed globally to rule out local execution environment issues.
    *   Explicit types from `@solana/web3.js` (e.g., `PublicKey`, `Keypair`, `SystemProgram`) were used more extensively in the script to align with common practices and the project's main test file.
7.  **Script Comparison:** The `initializeConfigScript_InitializeConfig.ts` was closely compared with the existing, working test file (`solana_lottery_contract.ts`) to identify discrepancies in setup or invocation.
8.  **Selective Commenting:** Parts of the `.accounts({...})` object (e.g., `admin`, `systemProgram`) were temporarily commented out to isolate whether the `lotteryConfig` property was the sole cause of the TS2353 error. The error persisted on the `lotteryConfig` line.
9.  **Field Access Correction:** Based on other TypeScript errors (`TS2551: Property '...' does not exist... Did you mean '...'?`), the script was updated to use camelCase (e.g., `configAccount.adminKey`) when accessing fields from the fetched `configAccount` data, aligning with Anchor's client-side object mapping.

## Current Status

Despite these comprehensive efforts, the `TS2353` error regarding the `lotteryConfig` account in the `.accounts` call remains unresolved. This suggests a more fundamental or subtle mismatch between the smart contract's actual interface (as understood by the Anchor framework and its type generation) and how the client-side script is attempting to interact with it for the `initializeConfig` instruction. The warning during `anchor build` about an unused `lottery_config` variable within the Rust code might also be a symptom or related issue, though its direct link to the TypeScript error is not immediately clear.

Further investigation might require a deeper dive into the Anchor framework's internals regarding type generation, or a re-evaluation of the `initialize_config` instruction's account definition in the Rust smart contract itself.

