"use client";

import Link from "next/link";
import type { Session } from "@/lib/api";
import { clock, sessionDay } from "@/lib/format";
import { useSession } from "@/components/Session";
import { TopBar } from "@/components/ui";

export function useTrainingRoles() {
  const { me } = useSession();
  const roles = me.member.roles;
  return {
    canRun: roles.some((r) => r === "ADMIN" || r === "COACH" || r === "CAPTAIN"),
    canPlan: roles.some((r) => r === "ADMIN" || r === "COACH"),
  };
}

/** Coach, captain and admins run training. */
export function TrainingGate({ children }: { children: React.ReactNode }) {
  const { canRun } = useTrainingRoles();
  if (!canRun) {
    return (
      <>
        <TopBar back="/" />
        <main className="page"><div className="empty">Training is for the coach, captain and admins.</div></main>
      </>
    );
  }
  return <>{children}</>;
}

export function SessionCard({ s }: { s: Session }) {
  const isToday = s.date === new Date().toLocaleDateString("en-CA");
  return (
    <Link href={`/training/${s.id}`} className={`card stack ${isToday ? "card-accent" : ""}`} style={{ gap: 6, opacity: s.status === "CANCELLED" ? 0.5 : 1 }}>
      <div className="spread">
        <span className="mono" style={{ fontWeight: 600 }}>{isToday ? "TODAY" : sessionDay(s.date)} · {clock(s.time)}</span>
        <span className={`kind kind-${s.kind}`}>{s.impromptu ? "Impromptu · " : ""}{s.kind === "COMPULSORY" ? "Compulsory" : "Optional"}</span>
      </div>
      <span className="muted small">{[s.focus, s.venue].filter(Boolean).join(" · ")}</span>
      <span className="small">
        {s.status === "CANCELLED" ? "Cancelled" : s.status === "CLOSED" ? `Closed · ${s.markedCount} marked` : (
          <><strong className="money-in">{s.inCount} in</strong> · {s.outCount} out</>
        )}
      </span>
    </Link>
  );
}
