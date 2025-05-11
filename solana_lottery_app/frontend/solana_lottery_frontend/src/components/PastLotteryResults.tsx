"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Winner {
  walletAddress: string;
  prizeAmount: string | number;
  isMainWinner: boolean;
}

interface PastRound {
  roundId: string | number;
  drawDate: string;
  totalPot: string | number;
  winners: Winner[];
}

interface PastLotteryResultsProps {
  pastRounds: PastRound[];
}

export const PastLotteryResults: React.FC<PastLotteryResultsProps> = ({ pastRounds }) => {
  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle>Past Lottery Results</CardTitle>
        <CardDescription>Review the winners and details from previous rounds.</CardDescription>
      </CardHeader>
      <CardContent>
        {pastRounds.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {pastRounds.map((round) => (
              <AccordionItem value={`round-${round.roundId}`} key={round.roundId}>
                <AccordionTrigger>Round #{round.roundId} - Drawn: {new Date(round.drawDate).toLocaleDateString()}</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">Total Pot: <span className="font-semibold">{round.totalPot} SOL</span></p>
                  <h4 className="font-semibold mb-1 mt-3">Winners:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {round.winners.map((winner, index) => (
                      <li key={index}>
                        <span className={`font-mono break-all ${winner.isMainWinner ? "font-bold text-amber-500" : ""}`}>{winner.walletAddress}</span>
                        <span className="ml-2">- Prize: {winner.prizeAmount} SOL {winner.isMainWinner ? "(Main Winner)" : ""}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-sm text-muted-foreground">No past lottery results available yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

