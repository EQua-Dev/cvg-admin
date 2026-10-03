"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Session } from "@/lib/api";
import { TopBar } from "@/components/ui";
import { SessionCard, TrainingGate, useTrainingRoles } from "./shared";

function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
}

export default function TrainingPage() {
  return (
    <TrainingGate>
      <Training />
    </TrainingGate>
  );
}

function Training() {
  const { canPlan } = useTrainingRoles();
  const [upcoming, setUpcoming] = useState<Session[] | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);

  useEffect(() => {
    api<Session[]>("/training/sessions").then(setUpcoming);
    api<Session[]>(`/training/sessions?from=${isoDay(-14)}&to=${isoDay(-1)}`).then((l) => setRecent(l.reverse()));
  }, []);

  const unclosed = recent.filter((s) => s.status === "SCHEDULED");

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Training</h1>
          {canPlan && <Link href="/training/new" className="btn btn-primary btn-sm">+ Impromptu</Link>}
        </div>

        <div className="row">
          {canPlan && <Link href="/training/schedule" className="btn btn-ghost grow btn-sm">Weekly schedule</Link>}
          <Link href="/training/report" className="btn btn-ghost grow btn-sm">Attendance</Link>
        </div>

        {unclosed.length > 0 && (
          <>
            <span className="label">Not closed yet</span>
            {unclosed.map((s) => <SessionCard key={s.id} s={s} />)}
          </>
        )}

        <span className="label">Coming up</span>
        {!upcoming ? (
          <div className="empty"><span className="spinner" /></div>
        ) : upcoming.length === 0 ? (
          <div className="empty">
            No sessions in the next two weeks.
            {canPlan && (
              <>
                <br />
                <Link href="/training/schedule" className="btn btn-primary" style={{ marginTop: 12 }}>Set the weekly schedule</Link>
              </>
            )}
          </div>
        ) : (
          upcoming.map((s) => <SessionCard key={s.id} s={s} />)
        )}
      </main>
    </>
  );
}
