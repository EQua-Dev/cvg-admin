"use client";

import type { SlotView } from "@/lib/api";

function initials(name?: string) {
  if (!name) return "";
  const parts = name.replace(/\(.*\)/, "").trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A portrait pitch with one disc per spot. Tap a disc to pick for it.
 * Own goal at the bottom, so the team "attacks up the screen".
 */
export function Pitch({
  slots,
  onSlot,
  selected,
  captainId,
  highlight,
  scores,
  links,
}: {
  slots: SlotView[];
  onSlot?: (idx: number) => void;
  selected?: number | null;
  captainId?: string;
  highlight?: string;
  scores?: Record<number, number | undefined>;
  links?: { a: number; b: number; link: "GREEN" | "AMBER" | "RED"; scope: "NEIGHBOURS" | "TEAM" }[];
}) {
  const at = (idx: number) => slots.find((s) => s.idx === idx);
  return (
    <div className="pitch" role="group" aria-label="Lineup">
      <svg className="pitch-lines" viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden>
        <rect x="3" y="3" width="94" height="127" />
        <line x1="3" y1="66.5" x2="97" y2="66.5" />
        <circle cx="50" cy="66.5" r="10" />
        <rect x="25" y="3" width="50" height="17" />
        <rect x="25" y="113" width="50" height="17" />
        <rect x="38" y="3" width="24" height="6" />
        <rect x="38" y="124" width="24" height="6" />
      </svg>
      {links && links.length > 0 && (
        <svg className="pitch-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {links.map((l, i) => {
            const a = at(l.a);
            const b = at(l.b);
            if (!a || !b) return null;
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`chem chem-${l.link}`}
                strokeDasharray={l.scope === "TEAM" ? "3 3" : undefined} vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>
      )}
      {slots.map((s) => {
        const filled = !!(s.memberId || s.guestName);
        const score = scores?.[s.idx];
        return (
          <button
            key={s.idx}
            type="button"
            className={`disc ${filled ? "disc-on" : ""} ${selected === s.idx ? "disc-sel" : ""} ${highlight && s.memberId === highlight ? "disc-me" : ""}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            onClick={() => onSlot?.(s.idx)}
            disabled={!onSlot}
            aria-label={`${s.position}: ${s.name ?? "empty"}`}
          >
            <span className="disc-face">
              {s.photoUrl ? <img src={s.photoUrl} alt="" /> : filled ? (s.jerseyNumber ?? initials(s.name)) : "+"}
              {captainId && s.memberId === captainId && <span className="disc-c">C</span>}
              {score !== undefined && filled && <span className={`disc-score ${score >= 75 ? "hi" : score >= 55 ? "mid" : "lo"}`}>{score}</span>}
            </span>
            <span className="disc-name">{filled ? s.name : s.position}</span>
          </button>
        );
      })}
    </div>
  );
}
