"use client";

import { PLAN_NAMES, type PlayerStyle } from "@/lib/api";

/** Five small bars: fit for each game plan, the best one in orange. */
export function PlanBars({ fits, top }: { fits: PlayerStyle["planFits"]; top?: string }) {
  if (fits.length === 0) return <span className="muted small">No data yet</span>;
  return (
    <div className="stack" style={{ gap: 3, width: 110, flexShrink: 0 }}>
      <div className="plan-bars">{fits.map((f) => <span key={f.code} className={f.code === top ? "top" : ""} style={{ height: `${Math.max(4, f.fit)}%` }} title={`${f.name} ${f.fit}`} />)}</div>
      <div className="plan-names">{fits.map((f) => <span key={f.code} title={PLAN_NAMES[f.code]}>{f.code}</span>)}</div>
    </div>
  );
}
