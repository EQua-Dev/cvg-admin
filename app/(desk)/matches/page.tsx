"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type MatchView } from "@/lib/api";
import { TopBar } from "@/components/ui";
import { MatchCard, MatchGate, useMatchRoles } from "./shared";

export default function MatchesPage() {
  return (
    <MatchGate>
      <Matches />
    </MatchGate>
  );
}

function Matches() {
  const { canPlan } = useMatchRoles();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [list, setList] = useState<MatchView[] | null>(null);

  useEffect(() => {
    setList(null);
    api<MatchView[]>(`/matches?when=${tab}`).then(setList);
  }, [tab]);

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Matches</h1>
          {canPlan && <Link href="/matches/new" className="btn btn-primary btn-sm">+ Match</Link>}
        </div>
        <div className="segmented">
          <button className={tab === "upcoming" ? "on" : ""} onClick={() => setTab("upcoming")}>Coming up</button>
          <button className={tab === "past" ? "on" : ""} onClick={() => setTab("past")}>Results</button>
        </div>
        {!list ? (
          <div className="empty"><span className="spinner" /></div>
        ) : list.length === 0 ? (
          <div className="empty">{tab === "upcoming" ? "No matches arranged." : "No results yet."}</div>
        ) : (
          list.map((m) => <MatchCard key={m.id} m={m} />)
        )}
      </main>
    </>
  );
}
