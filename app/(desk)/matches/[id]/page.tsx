"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, PLAN_NAMES, SIDE_LABEL, TYPE_LABEL, type MatchDetail } from "@/lib/api";
import { clock, sessionDay } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { MatchGate, useMatchRoles } from "../shared";
import { SquadTab } from "./SquadTab";
import { LineupTab } from "./LineupTab";
import { ResultTab } from "./ResultTab";

type Tab = "squad" | "lineup" | "result";

export default function MatchPage() {
  return (
    <MatchGate>
      <MatchScreen />
    </MatchGate>
  );
}

function MatchScreen() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { canPlan } = useMatchRoles();
  const [data, setData] = useState<MatchDetail | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);

  const load = useCallback(async () => {
    const d = await api<MatchDetail>(`/matches/${id}`);
    setData(d);
    setTab((t) => t ?? (d.match.status === "PLAYED" || new Date(d.match.kickoffAt) < new Date() ? "result" : canPlan ? "lineup" : "squad"));
  }, [id, canPlan]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel() {
    if (!confirm("Cancel this match?")) return;
    try {
      await api(`/matches/${id}/cancel`, { method: "POST" });
      toast.show("Cancelled");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (!data || !tab) return <><header className="topbar"><Link href="/matches" className="back">← Matches</Link></header><div className="empty"><span className="spinner" /></div></>;
  const m = data.match;
  const today = new Date().toLocaleDateString("en-CA");
  const resultOpen = m.date <= today && m.status !== "CANCELLED";

  return (
    <>
      <header className="topbar">
        <Link href="/matches" className="back">← Matches</Link>
        {canPlan && m.status === "SCHEDULED" && <Link href={`/matches/${id}/edit`} className="btn btn-quiet" style={{ marginLeft: "auto" }}>Edit</Link>}
      </header>
      <main className="page" style={{ gap: 14 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1" style={{ fontSize: 26 }}>vs {m.opponent}</h1>
          <span className="mono small" style={{ fontWeight: 600 }}>
            {m.date === today ? "TODAY" : sessionDay(m.date)} · {clock(m.time)}{m.meetTime ? ` · meet ${clock(m.meetTime)}` : ""}
          </span>
          <span className="muted small">
            {[m.venue, SIDE_LABEL[m.side], TYPE_LABEL[m.type], `${m.teamSize}-a-side`, m.gamePlan && `Plan: ${PLAN_NAMES[m.gamePlan]}${m.planB ? ` → ${PLAN_NAMES[m.planB]}` : ""}`, m.kit && `Kit: ${m.kit}`]
              .filter(Boolean).join(" · ")}
          </span>
        </div>

        {m.status === "CANCELLED" ? (
          <div className="notice notice-caution">Cancelled.</div>
        ) : (
          <div className="segmented">
            <button className={tab === "squad" ? "on" : ""} onClick={() => setTab("squad")}>Squad · {m.inCount}</button>
            <button className={tab === "lineup" ? "on" : ""} onClick={() => setTab("lineup")}>Lineup{m.lineupPublished ? " ✓" : ""}</button>
            <button className={tab === "result" ? "on" : ""} onClick={() => setTab("result")} disabled={!resultOpen} style={resultOpen ? undefined : { opacity: 0.4 }}>Result</button>
          </div>
        )}

        {m.status !== "CANCELLED" && tab === "squad" && <SquadTab match={m} onChange={load} />}
        {m.status !== "CANCELLED" && tab === "lineup" && <LineupTab data={data} onChange={load} />}
        {m.status !== "CANCELLED" && tab === "result" && <ResultTab data={data} onChange={load} />}

        {canPlan && m.status === "SCHEDULED" && tab === "squad" && <button className="btn btn-quiet" onClick={cancel}>Cancel this match</button>}
      </main>
    </>
  );
}
