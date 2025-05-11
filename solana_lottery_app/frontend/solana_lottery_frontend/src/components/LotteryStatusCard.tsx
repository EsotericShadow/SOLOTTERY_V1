"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LotteryStatusCardProps {
  potAmount: string | number;
  timeRemaining: string;
  currentRoundId: string | number;
  userEntries: number;
  onEnterLottery: () => void; // Will be used in next step for transaction
  isConnected: boolean;
}

export const LotteryStatusCard: React.FC<LotteryStatusCardProps> = ({
  potAmount,
  timeRemaining,
  currentRoundId,
  userEntries,
  onEnterLottery,
  isConnected
}) => {
  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle>Current Lottery Round: #{currentRoundId}</CardTitle>
        <CardDescription>Join now for a chance to win!</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-lg">Total Pot: <span className="font-semibold text-green-500">{potAmount} SOL</span></p>
        <p className="mb-4">Time until draw: <span className="font-semibold">{timeRemaining}</span></p>
        {isConnected && (
          <p className="mb-4">Your entries this round: <span className="font-semibold">{userEntries}</span></p>
        )}
        {isConnected ? (
          <Button className="w-full" onClick={onEnterLottery}>
            Enter Lottery (1 SOL)
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Connect your wallet to enter the lottery.</p>
        )}
      </CardContent>
    </Card>
  );
};

