# Solana Weekly Lottery Application

This repository contains the source code and documentation for the Solana Weekly Lottery Application, a decentralized lottery system built on the Solana blockchain.

## Project Overview

For a comprehensive understanding of the project, including its goals, architecture, technologies used, detailed setup instructions, current status, and how to contribute, please refer to the **[Project Overview Document](./docs/project_overview.md)**.

## Quick Start

Detailed setup instructions for both the smart contract and the frontend application can be found in the [Project Setup section of the Project Overview](./docs/project_overview.md#62-project-setup).

In summary:

### Smart Contract (Anchor - Rust)

Located in `solana_lottery_app/smart_contract/solana_lottery_contract/`

1.  **Prerequisites:** Ensure Rust, Cargo, Solana CLI, and Anchor Framework are installed.
2.  **Build:** Navigate to the directory and run `anchor build`.
3.  **Test:** Run `anchor test` for localnet tests.
4.  **Deploy:** Use `anchor deploy --provider.cluster <devnet/localnet>`.

### Frontend (Next.js - TypeScript)

Located in `solana_lottery_app/frontend/solana_lottery_frontend/`

1.  **Prerequisites:** Ensure Node.js and Yarn (or npm) are installed.
2.  **Install Dependencies:** Navigate to the directory and run `yarn install` (or `npm install`).
3.  **Run Development Server:** `yarn dev` (or `npm run dev`). The application will be available at `http://localhost:3000`.

## Current Status (as of May 11, 2025)

The project is actively under development (currently in Sprint 3).

*   The smart contract has been initialized on Devnet.
*   Core functionalities like starting new rounds and entering the lottery are being tested on Devnet.
*   The frontend is being integrated with the live Devnet contract.

For the latest detailed status, please see the [Current Status section in the Project Overview](./docs/project_overview.md#5-current-status-as-of-may-11-2025).

## Documentation

*   **Main Project Documentation:** [./docs/project_overview.md](./docs/project_overview.md)
*   **Development Logs & Sprint Plans:** Located within the [./docs/](./docs/) directory, providing insights into the development process and decisions.

## How to Contribute

We welcome contributions! Please refer to the [How to Get Started section in the Project Overview](./docs/project_overview.md#6-how-to-get-started-for-new-developers) for guidance on setting up your environment and understanding the codebase.

(Further contribution guidelines, coding standards, and issue tracking information will be added to a `CONTRIBUTING.md` file in the future.)

