"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  walletAddress: string;
  entryCount: number;
}

interface ParticipantsListProps {
  participants: Participant[];
  currentRoundId: string | number;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants, currentRoundId }) => {
  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle>Participants - Round #{currentRoundId}</CardTitle>
        <CardDescription>See who has entered the current lottery round.</CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length > 0 ? (
          <ScrollArea className="h-[200px]">
            <ul className="space-y-2">
              {participants.map((p, index) => (
                <li key={index} className="text-sm p-2 border rounded-md">
                  <span className="font-mono break-all">{p.walletAddress}</span>
                  <span className="ml-2 badge badge-neutral">Entries: {p.entryCount}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No participants have entered this round yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

