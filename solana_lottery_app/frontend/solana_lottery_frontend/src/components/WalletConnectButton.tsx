"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React from "react";

export const WalletConnectButton: React.FC = () => {
    return (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px" }}>
            <WalletMultiButton />
        </div>
    );
};

