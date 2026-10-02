"use client";

import { useEffect, useState } from "react";
import { api, PLAN_NAMES, type Profile, type ProfilingResult } from "@/lib/api";

const FOOT: Record<string, string> = { RIGHT: "Right", LEFT: "Left", BOTH: "Both" };
const MISSING: Record<string, string> = {
  photo: "Photo",
  favouredPosition: "Position",
  dominantFoot: "Foot",
  emergencyContact: "Emergency contact",
  consent: "Photo permission",
};

/** What the player filled in, and their playing style once they've done the questionnaire. */
export function MemberProfileCard({ memberId, canSeeStyle }: { memberId: string; canSeeStyle: boolean }) {
  const [p, setP] = useState<Profile | null>(null);
  const [style, setStyle] = useState<ProfilingResult | null>(null);

  useEffect(() => {
    api<Profile>(`/members/${memberId}/profile`).then(setP).catch(() => {});
    if (canSeeStyle) {
      api<{ result: ProfilingResult } | undefined>(`/members/${memberId}/profiling`)
        .then((r) => setStyle(r?.result ?? null))
        .catch(() => {});
    }
  }, [memberId, canSeeStyle]);

  if (!p) return null;

  return (
    <>
      <section className="card stack" style={{ gap: 12 }}>
        <div className="spread">
          <span className="label">Profile</span>
          <span className={`status ${p.complete ? "status-ACTIVE" : "status-TRIALIST"}`}>
            {p.complete ? "✓ Complete" : `${5 - p.missing.length} of 5 done`}
          </span>
        </div>
        {p.favouredPosition ? (
          <div>
            <div className="kv"><span className="muted">Position</span><span><strong>{p.favouredPosition}</strong>{p.otherPositions.length ? ` · ${p.otherPositions.join(" · ")}` : ""}</span></div>
            {p.dominantFoot && <div className="kv"><span className="muted">Foot</span><span>{FOOT[p.dominantFoot]}{p.weakFoot ? ` · weak ${"★".repeat(p.weakFoot)}` : ""}</span></div>}
            {p.strengths.length > 0 && <div className="kv"><span className="muted">Strengths</span><span style={{ textAlign: "right" }}>{p.strengths.join(", ")}</span></div>}
            {p.weaknesses.length > 0 && <div className="kv"><span className="muted">To improve</span><span style={{ textAlign: "right" }}>{p.weaknesses.join(", ")}</span></div>}
            {(p.heightCm || p.age) && (
              <div className="kv"><span className="muted">About</span><span>{[p.age && `${p.age} yrs`, p.heightCm && `${p.heightCm} cm`, p.stateOfOrigin].filter(Boolean).join(" · ")}</span></div>
            )}
            {p.emergencyContact && (
              <div className="kv"><span className="muted">Emergency</span><span style={{ textAlign: "right" }}>{p.emergencyContact.name}<br /><span className="mono small">{p.emergencyContact.phone}</span></span></div>
            )}
          </div>
        ) : (
          <span className="muted small">Not filled in yet. Send them their join link.</span>
        )}
        {!p.complete && p.missing.length > 0 && (
          <span className="muted small">Missing: {p.missing.map((k) => MISSING[k] ?? k).join(", ")}</span>
        )}
      </section>

      {style && (
        <section className="card stack" style={{ gap: 10 }}>
          <span className="label">Playing style</span>
          <strong style={{ fontSize: 18 }}>{style.label}</strong>
          {style.secondaryRole && <span className="muted small">Also: {style.secondaryRole.name}</span>}
          {Object.entries(style.planFits)
            .sort((a, b) => b[1] - a[1])
            .map(([code, fit], i) => (
              <div key={code} className="row" style={{ gap: 10 }}>
                <span style={{ width: 92 }} className="small">{PLAN_NAMES[code] ?? code}</span>
                <span className="grow" style={{ height: 8, background: "var(--haze)", borderRadius: 4, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${fit}%`, background: i === 0 ? "var(--orange)" : "var(--teal)" }} />
                </span>
                <span className="mono small" style={{ width: 28, textAlign: "right" }}>{fit}</span>
              </div>
            ))}
          {style.lowConfidence && <span className="notice notice-caution small">Answers were mixed. Worth a chat.</span>}
          {style.coachPick && <span className="muted small">Thinks CVG should play: {style.coachPick}</span>}
        </section>
      )}
    </>
  );
}
