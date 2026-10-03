"use client";

import { useEffect, useState } from "react";
import { api, type MemberAttendance } from "@/lib/api";
import { TopBar } from "@/components/ui";
import { TrainingGate } from "../shared";

export default function ReportPage() {
  return (
    <TrainingGate>
      <Report />
    </TrainingGate>
  );
}

function pctColor(p?: number) {
  if (p == null) return "var(--muted)";
  return p >= 75 ? "var(--good)" : p >= 50 ? "var(--caution)" : "var(--alert)";
}

function Report() {
  const [rows, setRows] = useState<MemberAttendance[] | null>(null);

  useEffect(() => {
    api<MemberAttendance[]>("/training/stats").then(setRows);
  }, []);

  return (
    <>
      <TopBar back="/training" />
      <main className="page">
        <h1 className="h1">Attendance</h1>
        <span className="muted small">This season · compulsory sessions. Late counts as present; excused doesn&apos;t count.</span>
        {!rows ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <div className="card" style={{ padding: "4px 8px", overflowX: "auto" }}>
            <table className="stat-table">
              <thead>
                <tr><th>Player</th><th>%</th><th title="Attended of counted">Att</th><th title="Streak">🔥</th><th title="Optional sessions attended">+</th><th title="Said in, didn't come">No-show</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.memberId}>
                    <td className="name">{r.fullName}</td>
                    <td style={{ color: pctColor(r.percent), fontWeight: 700 }}>{r.percent == null ? "–" : `${r.percent}%`}</td>
                    <td>{r.attended}/{r.counted}</td>
                    <td>{r.streak || ""}</td>
                    <td>{r.extras || ""}</td>
                    <td style={{ color: r.noShows ? "var(--alert)" : undefined }}>{r.noShows || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
