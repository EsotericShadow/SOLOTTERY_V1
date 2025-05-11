"use client";

import { WalletConnectButton } from "@/components/WalletConnectButton";
import { LotteryStatusCard } from "@/components/LotteryStatusCard";
import { ParticipantsList } from "@/components/ParticipantsList";
import { PastLotteryResults } from "@/components/PastLotteryResults";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { useState, useEffect } from "react";
import { useSolanaLottery } from "@/lib/solanaLotteryHooks";
import { Button } from "@/components/ui/button";
// Import the comprehensive mock data
import { 
  MOCK_LOTTERY_CONFIG,
  MOCK_CURRENT_LOTTERY_ROUND,
  MOCK_PAST_LOTTERY_ROUNDS 
} from "@/lib/mockData";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const { enterLottery: callEnterLottery, getProgram } = useSolanaLottery();
  const [isLoading, setIsLoading] = useState(false);

  // Use comprehensive mock data for initial state
  const [currentLotteryData, setCurrentLotteryData] = useState({
    roundId: MOCK_CURRENT_LOTTERY_ROUND.roundId.toString(),
    potAmount: (MOCK_CURRENT_LOTTERY_ROUND.totalPot / 1_000_000_000).toFixed(2), // Convert lamports to SOL
    timeRemaining: (() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = MOCK_CURRENT_LOTTERY_ROUND.endTime - now;
      if (remaining <= 0) return "Ended";
      const d = Math.floor(remaining / (3600 * 24));
      const h = Math.floor((remaining % (3600 * 24)) / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      return `${d}d ${h}h ${m}m`;
    })(),
    userEntries: 0, // This would typically be fetched or derived for the connected user
    entryFee: (MOCK_LOTTERY_CONFIG.entryFeeLamports / 1_000_000_000).toFixed(2) // Entry fee from config
  });

  const [participantsData, setParticipantsData] = useState(
    MOCK_CURRENT_LOTTERY_ROUND.participants.map(p => ({ walletAddress: p, entryCount: 1 })) // Assuming 1 entry per mock participant for now
  );
  const [pastRoundsData, setPastRoundsData] = useState(
    MOCK_PAST_LOTTERY_ROUNDS.map(round => ({
      roundId: round.roundId.toString(),
      drawDate: new Date(round.endTime * 1000).toISOString(), // Convert timestamp to ISO string
      totalPot: (round.totalPot / 1_000_000_000).toFixed(2),
      winners: [
        { walletAddress: round.prizeDistribution.mainWinner, prizeAmount: ((round.totalPot * 0.5) / 1_000_000_000).toFixed(2), isMainWinner: true },
        ...(round.prizeDistribution.secondaryWinners.map(sw => ({ walletAddress: sw, prizeAmount: ((round.totalPot * 0.1) / 1_000_000_000).toFixed(2), isMainWinner: false })))
      ],
    }))
  );

  useEffect(() => {
    const fetchData = async () => {
      if (connected && publicKey) {
        console.log("Frontend: Wallet connected. In a real scenario, would fetch live data here.");
        // For now, we are using mock data. Live data fetching logic would go here.
        // Example: Update userEntries based on connected publicKey if they are in MOCK_CURRENT_LOTTERY_ROUND.participants
        const userIsParticipant = MOCK_CURRENT_LOTTERY_ROUND.participants.includes(publicKey.toBase58());
        setCurrentLotteryData(prev => ({ ...prev, userEntries: userIsParticipant ? 1 : 0 }));
      }
    };
    fetchData();
  }, [connected, publicKey]);

  const handleEnterLottery = async () => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first!");
      return;
    }
    setIsLoading(true);
    console.log("Frontend: Attempting to call 'enterLottery' (currently points to hook with live logic).");
    // In a pure mock setup, this would simulate a successful entry and update mock data.
    // For now, it will still try to call the actual hook.
    // To fully mock, we'd need to modify useSolanaLottery hook or bypass it here.
    alert("Mock Mode: Simulating lottery entry. In a real scenario, this would interact with the smart contract.");
    // Simulate adding the user to participants list and increasing pot for UI feedback
    setParticipantsData(prev => [...prev, { walletAddress: publicKey.toBase58(), entryCount: 1}]);
    setCurrentLotteryData(prev => ({
      ...prev,
      potAmount: (parseFloat(prev.potAmount) + parseFloat(prev.entryFee)).toFixed(2),
      userEntries: prev.userEntries + 1,
    }));
    setIsLoading(false);
    // const signature = await callEnterLottery(); // Original call to live contract
    // if (signature) { ... }
  };

  return (
    <main className="flex flex-col min-h-screen items-center p-4 pt-10 sm:p-8 bg-slate-900 text-white">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Solana Weekly Lottery
          </h1>
          <WalletConnectButton />
        </div>

        {connected ? (
          <LotteryStatusCard
            potAmount={currentLotteryData.potAmount}
            timeRemaining={currentLotteryData.timeRemaining}
            currentRoundId={currentLotteryData.roundId}
            userEntries={currentLotteryData.userEntries} 
            onEnterLottery={handleEnterLottery}
            isConnected={connected}
          />
        ) : (
          <Card className="w-full mb-8 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Connect Your Wallet</CardTitle>
              <CardDescription className="text-slate-400">
                Please connect your Solana wallet (e.g., Phantom) to participate in the lottery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Once connected, you will be able to see lottery details and enter the current round.</p>
            </CardContent>
          </Card>
        )}

        {connected && (
            <Button onClick={handleEnterLottery} disabled={isLoading} className="w-full mb-8 bg-purple-600 hover:bg-purple-700">
                {isLoading ? "Processing Entry..." : `Enter Lottery (${currentLotteryData.entryFee} SOL)`}
            </Button>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
            <ParticipantsList participants={participantsData} currentRoundId={currentLotteryData.roundId} />
            <PastLotteryResults pastRounds={pastRoundsData} />
        </div>

        <Card className="w-full bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Lottery Information</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300">
            <p className="mb-2"><strong>How it works:</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
              <li>Connect your Solana Phantom wallet.</li>
              <li>Send SOL to the lottery wallet to enter (entry fee displayed on button).</li>
              <li>Everyone can see the total pot and who has contributed.</li>
              <li>At the set draw time, prizes are automatically dispersed based on on-chain randomness.</li>
            </ul>
            <p className="mb-2"><strong>Prize Distribution:</strong></p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>10% for platform development & maintenance.</li>
              <li>50% to the main winner.</li>
              <li>40% split equally among 4 other winners (10% each).</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}

