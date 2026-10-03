"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage, type PlayerStyle, type RoleRef } from "@/lib/api";
import { Sheet } from "@/components/money";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { JerseyBadge, TopBar } from "@/components/ui";
import { PlanBars } from "@/components/PlanBars";

/** Squad styles: who suits which plan, and where self and squad see a player's role differently. */
export default function StylesPage() {
  const toast = useToast();
  const { me } = useSession();
  const canSet = me.member.roles.some((r) => r === "ADMIN" || r === "COACH");
  const [list, setList] = useState<PlayerStyle[] | null>(null);
  const [open, setOpen] = useState<PlayerStyle | null>(null);
  const [roles, setRoles] = useState<RoleRef[]>([]);
  const [filter, setFilter] = useState<"all" | "disagree">("all");

  useEffect(() => {
    api<PlayerStyle[]>("/styles").then(setList);
  }, []);

  useEffect(() => {
    if (open?.group) api<RoleRef[]>(`/styles/roles/${open.group}`).then(setRoles);
  }, [open]);

  async function setRole(p: PlayerStyle, role: string | null) {
    try {
      const updated = await api<PlayerStyle>(`/styles/${p.memberId}/role`, { method: "PUT", body: { role } });
      setList((l) => l?.map((x) => (x.memberId === p.memberId ? updated : x)) ?? null);
      setOpen(updated);
      toast.show(`${p.name}: ${updated.role?.name ?? "role cleared"} ✓`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function newRound() {
    if (!confirm("Ask everyone to do the questionnaire again?")) return;
    try {
      await api("/styles/rounds", { method: "POST" });
      toast.show("Done ✓ It shows on everyone's home screen");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (!list) return <><TopBar back="/members" /><div className="empty"><span className="spinner" /></div></>;
  const disagreements = list.filter((p) => p.disagree && !p.coachRole).length;
  const shown = filter === "disagree" ? list.filter((p) => p.disagree) : list;

  return (
    <>
      <TopBar back="/members" />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Styles</h1>
          <Link href="/styles/rules" className="btn btn-ghost btn-sm">Chemistry rules</Link>
        </div>
        <div className="segmented">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Everyone</button>
          <button className={filter === "disagree" ? "on" : ""} onClick={() => setFilter("disagree")}>Role check{disagreements ? ` · ${disagreements}` : ""}</button>
        </div>
        <div className="list">
          {shown.map((p) => (
            <button key={p.memberId} className="list-row" style={{ width: "100%", border: 0, background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => setOpen(p)}>
              <JerseyBadge n={p.jerseyNumber} />
              <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                <strong className="ellipsis">{p.name}<span className="muted small" style={{ fontWeight: 400 }}> · {p.position ?? "—"}</span></strong>
                <span className="small">{p.label ?? <span className="muted">No style yet</span>}</span>
                {p.disagree && !p.coachRole && <span className="small" style={{ color: "var(--caution)" }}>⚠ Says {p.selfRole?.name} · squad says {p.peerRoles?.[0]?.name}</span>}
              </span>
              <PlanBars fits={p.planFits} top={p.topPlan} />
            </button>
          ))}
        </div>
        <span className="muted small">POS Possession · CTR Counter · PRS Press · BLK Defend · DIR Direct</span>
        {canSet && <button className="btn btn-quiet" onClick={newRound}>Ask everyone to redo the questionnaire</button>}
      </main>

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <strong>{open.fullName}</strong>
          <span className="small">{open.label ?? "No style yet"}{open.lowConfidence ? <span className="muted"> · answers were mixed</span> : null}</span>
          {open.planFits.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {open.planFits.map((f) => (
                <div key={f.code} className="row small" style={{ gap: 8 }}>
                  <span style={{ width: 96 }}>{f.name}</span>
                  <span className="progress-bar grow"><span style={{ display: "block", height: "100%", width: `${f.fit}%`, background: f.code === open.topPlan ? "var(--orange)" : "var(--teal)" }} /></span>
                  <strong className="mono" style={{ width: 28, textAlign: "right" }}>{f.fit}</strong>
                </div>
              ))}
              <span className="muted small">From: {[open.planFits.some((f) => f.self != null) && "questionnaire", open.planFits.some((f) => f.ratings != null) && "ratings", open.planFits.some((f) => f.matches != null) && "results"].filter(Boolean).join(" + ") || "—"}</span>
            </div>
          )}
          <div className="kv"><span className="muted">Says</span><span>{open.selfRole?.name ?? "—"}</span></div>
          <div className="kv"><span className="muted">Squad says</span><span>{open.peerRoles?.length ? open.peerRoles.map((r) => `${r.name} (${r.votes})`).join(", ") : "—"}</span></div>
          {canSet && open.group && (
            <>
              <span className="label">Your call</span>
              <div className="chips">
                {roles.map((r) => (
                  <button key={r.code} className={`chip ${open.coachRole?.code === r.code ? "chip-on" : ""}`} onClick={() => setRole(open, open.coachRole?.code === r.code ? null : r.code)}>{r.name}</button>
                ))}
              </div>
              <span className="muted small">Tap again to go back to their own answer.</span>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
