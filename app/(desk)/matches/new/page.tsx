"use client";

import { TopBar } from "@/components/ui";
import { MatchForm, MatchGate } from "../shared";

export default function NewMatchPage() {
  return (
    <MatchGate>
      <TopBar back="/matches" />
      <main className="page">
        <h1 className="h1">New match</h1>
        <MatchForm />
      </main>
    </MatchGate>
  );
}
