"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api, errorMessage, FACTOR_LABEL, PLAN_NAMES,
  type Candidate, type Factor, type LineupView, type MatchDetail, type MatchOptions, type SelectionView, type SlotView,
} from "@/lib/api";
import { lineupMessage, whatsappLink } from "@/lib/format";
import { Pitch } from "@/components/Pitch";
import { Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge } from "@/components/ui";
import { useMatchRoles } from "../shared";

const BENCH = 100;
type Pick = { memberId?: string; guestName?: string };
type RoleKey = "captainId" | "penaltyTakerId" | "freeKickTakerId" | "cornerTakerId";
const OFF_HINT: Partial<Record<Factor, string>> = { OVR: "after ratings", PLAN: "set a game plan", FORM: "after a match", ATTENDANCE: "after training" };
const ROLE_LABEL: Record<RoleKey, string> = { captainId: "Captain", penaltyTakerId: "Penalties", freeKickTakerId: "Free kicks", cornerTakerId: "Corners" };

function scoreColor(s: number) {
  return s >= 75 ? "var(--good)" : s >= 55 ? "var(--caution)" : "var(--slate)";
}

function fromLineup(l?: LineupView): Record<number, Pick> {
  const out: Record<number, Pick> = {};
  [...(l?.slots ?? []), ...(l?.bench ?? [])].forEach((s) => {
    if (s.memberId || s.guestName) out[s.idx] = { memberId: s.memberId, guestName: s.guestName };
  });
  return out;
}

/** The coach's board: tap a spot, pick from players ranked for it. */
export function LineupTab({ data, onChange }: { data: MatchDetail; onChange: () => void }) {
  const toast = useToast();
  const { canPlan } = useMatchRoles();
  const m = data.match;
  const editable = canPlan && m.status === "SCHEDULED";
  const [formations, setFormations] = useState<string[]>([]);
  const [formation, setFormation] = useState<string | undefined>(data.lineup?.formation ?? m.formation);
  const [picks, setPicks] = useState<Record<number, Pick>>(() => fromLineup(data.lineup));
  const [roles, setRoles] = useState<Partial<Record<RoleKey, string>>>(() => ({
    captainId: data.lineup?.captainId, penaltyTakerId: data.lineup?.penaltyTakerId,
    freeKickTakerId: data.lineup?.freeKickTakerId, cornerTakerId: data.lineup?.cornerTakerId,
  }));
  const [sel, setSel] = useState<SelectionView | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [roleSheet, setRoleSheet] = useState<RoleKey | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<LineupView | null>(data.lineup?.publishedAt ? data.lineup : null);

  useEffect(() => {
    api<MatchOptions>("/matches/options").then((o) => {
      const names = o.formations.filter((f) => f.teamSize === m.teamSize).map((f) => f.name);
      setFormations(names);
      setFormation((f) => f ?? names[0]);
    });
  }, [m.teamSize]);

  const loadSelection = useCallback(async () => {
    if (!formation) return;
    setSel(await api<SelectionView>(`/matches/${m.id}/selection?formation=${encodeURIComponent(formation)}`));
  }, [m.id, formation]);

  useEffect(() => {
    loadSelection();
  }, [loadSelection]);

  const byId = useMemo(() => new Map((sel?.candidates ?? []).map((c) => [c.memberId, c])), [sel]);
  const placed = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(picks).forEach(([idx, p]) => p.memberId && map.set(p.memberId, Number(idx)));
    return map;
  }, [picks]);

  if (!sel || !formation) return <div className="empty"><span className="spinner" /></div>;

  const slots: SlotView[] = sel.formation.slots.map((s) => {
    const p = picks[s.idx];
    const c = p?.memberId ? byId.get(p.memberId) : undefined;
    return { ...s, memberId: p?.memberId, guestName: p?.guestName, name: c?.name ?? p?.guestName, jerseyNumber: c?.jerseyNumber, photoUrl: c?.photoUrl };
  });
  const benchIdx = Array.from({ length: sel.benchSize }, (_, i) => BENCH + i);
  const filled = slots.filter((s) => s.memberId || s.guestName).length;
  const scores = Object.fromEntries(slots.map((s) => [s.idx, s.memberId ? byId.get(s.memberId)?.slotScores[s.idx] : undefined]));
  const lineupIds = Object.values(picks).map((p) => p.memberId).filter(Boolean) as string[];

  function change(next: Record<number, Pick>) {
    setPicks(next);
    setDirty(true);
    // Roles must stay with players still in the lineup.
    const ids = new Set(Object.values(next).map((p) => p.memberId));
    setRoles((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && ids.has(v) ? v : undefined])));
  }

  /** Put a member in a spot; if they were elsewhere, whoever was here swaps over. */
  function place(idx: number, memberId: string) {
    const next = { ...picks };
    const from = placed.get(memberId);
    const here = next[idx];
    if (from !== undefined) {
      if (here) next[from] = here;
      else delete next[from];
    }
    next[idx] = { memberId };
    change(next);
    setOpen(null);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function clear(idx: number) {
    const next = { ...picks };
    delete next[idx];
    change(next);
    setOpen(null);
  }

  /** Fills empty spots: best score first, available players only. Bench: best of the rest. */
  function autoFill() {
    const next = { ...picks };
    const used = new Set(Object.values(next).map((p) => p.memberId).filter(Boolean));
    const free = sel!.candidates.filter((c) => c.available && !used.has(c.memberId));
    const empty = sel!.formation.slots.filter((s) => !next[s.idx]).map((s) => s.idx);
    const pairs = free.flatMap((c) => empty.map((idx) => ({ idx, c, s: c.slotScores[idx] ?? 0 }))).sort((a, b) => b.s - a.s);
    for (const p of pairs) {
      if (next[p.idx] || used.has(p.c.memberId)) continue;
      next[p.idx] = { memberId: p.c.memberId };
      used.add(p.c.memberId);
    }
    const rest = free.filter((c) => !used.has(c.memberId))
      .sort((a, b) => (b.planBScore ?? best(b)) - (a.planBScore ?? best(a)));
    benchIdx.filter((i) => !next[i]).forEach((i) => {
      const c = rest.shift();
      if (c) next[i] = { memberId: c.memberId };
    });
    change(next);
    toast.show("Filled ✓ Tap any spot to change");
  }

  async function save(publish: boolean) {
    setBusy(true);
    try {
      const body = { formation, slots: Object.entries(picks).map(([idx, p]) => ({ idx: Number(idx), ...p })), ...roles };
      let l = await api<LineupView>(`/matches/${m.id}/lineup`, { method: "PUT", body });
      if (publish) l = await api<LineupView>(`/matches/${m.id}/lineup/publish`, { method: "POST" });
      setDirty(false);
      if (publish) setPublished(l);
      toast.show(publish ? "Lineup published ✓" : "Draft saved ✓");
      onChange();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    } finally {
      setBusy(false);
    }
  }

  const openCandidates = open === null ? [] : [...sel.candidates].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return scoreFor(b, open) - scoreFor(a, open);
  });
  const openSlot = open !== null && open < BENCH ? sel.formation.slots.find((s) => s.idx === open) : undefined;

  return (
    <>
      {formations.length > 1 && (
        <div className="chips">
          {formations.map((f) => (
            <button key={f} className={`chip ${f === formation ? "chip-on" : ""}`} disabled={!editable}
              onClick={() => { if (f !== formation) { setFormation(f); change(Object.fromEntries(Object.entries(picks).filter(([i]) => Number(i) >= BENCH))); } }}>
              {f}
            </button>
          ))}
        </div>
      )}

      {editable && (
        <div className="row">
          <button className="btn btn-ghost grow btn-sm" onClick={autoFill}>✨ Auto-fill</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeightsOpen(true)} aria-label="How scores work">⚙ Scores</button>
        </div>
      )}

      <Pitch slots={slots} onSlot={editable ? setOpen : undefined} selected={open} captainId={roles.captainId} scores={editable ? scores : undefined} />

      <span className="label">Bench{m.planB ? ` · ranked for ${PLAN_NAMES[m.planB]}` : ""}</span>
      <div className="bench-row">
        {benchIdx.map((i) => {
          const p = picks[i];
          const c = p?.memberId ? byId.get(p.memberId) : undefined;
          return (
            <button key={i} className={`bench-spot ${p ? "on" : ""}`} disabled={!editable} onClick={() => setOpen(i)}>
              {p ? <><span className="mono">{c?.jerseyNumber ?? "G"}</span><span>{c?.name ?? p.guestName}</span></> : <span className="muted">+</span>}
            </button>
          );
        })}
      </div>

      <div className="chips">
        {(Object.keys(ROLE_LABEL) as RoleKey[]).map((k) => {
          const c = roles[k] ? byId.get(roles[k]!) : undefined;
          return (
            <button key={k} className={`chip ${c ? "chip-on" : ""}`} disabled={!editable || lineupIds.length === 0} onClick={() => setRoleSheet(k)}>
              {ROLE_LABEL[k]}{c ? `: ${c.name}` : ""}
            </button>
          );
        })}
      </div>

      {editable && (
        <div className="sticky-action stack" style={{ gap: 8 }}>
          <div className="row">
            <button className="btn btn-ghost grow" disabled={busy || !dirty} onClick={() => save(false)}>Save draft</button>
            <button className="btn btn-primary grow" disabled={busy || filled < slots.length} onClick={() => save(true)}>
              {filled < slots.length ? `${slots.length - filled} to pick` : published && !dirty ? "Re-publish" : "Publish"}
            </button>
          </div>
          {published && !dirty && (
            <a className="btn btn-wa btn-block" target="_blank" rel="noreferrer" href={whatsappLink(lineupMessage(m, published))}>Share lineup on WhatsApp</a>
          )}
        </div>
      )}
      {!editable && !data.lineup && <div className="empty">No lineup yet.</div>}

      {open !== null && (
        <Sheet onClose={() => setOpen(null)}>
          <div className="spread">
            <strong>{openSlot ? `Pick · ${openSlot.position}` : "Pick · bench"}</strong>
            {picks[open] && <button className="btn btn-quiet" onClick={() => clear(open)}>Clear</button>}
          </div>
          <div className="list">
            {openCandidates.map((c) => {
              const s = scoreFor(c, open);
              const at = placed.get(c.memberId);
              const atLabel = at === undefined ? null : at >= BENCH ? "bench" : sel.formation.slots.find((x) => x.idx === at)?.position;
              return (
                <button key={c.memberId} className="list-row" style={{ width: "100%", border: 0, background: at === open ? "var(--haze)" : "none", textAlign: "left", cursor: "pointer", opacity: c.available ? 1 : 0.45 }}
                  onClick={() => place(open, c.memberId)}>
                  <JerseyBadge n={c.jerseyNumber} />
                  <span className="grow stack" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}{atLabel && <span className="pill" style={{ marginLeft: 6, background: "var(--haze)" }}>{atLabel}</span>}</span>
                    <span className="factor">
                      {[c.favoured, c.available ? null : "Out", c.attendancePercent != null && `Training ${c.attendancePercent}%`, c.goals + c.assists > 0 && `⚽${c.goals} 🅰${c.assists}`, c.factors.DUES === 0 && "Owes dues"]
                        .filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="score-bar"><span style={{ width: `${s}%`, background: scoreColor(s) }} /></span>
                  <span className="score-num" style={{ color: scoreColor(s) }}>{s}</span>
                </button>
              );
            })}
          </div>
          <GuestInput onAdd={(name) => { change({ ...picks, [open]: { guestName: name } }); setOpen(null); }} />
        </Sheet>
      )}

      {roleSheet && (
        <Sheet onClose={() => setRoleSheet(null)}>
          <strong>{ROLE_LABEL[roleSheet]}</strong>
          <div className="chips">
            {lineupIds.map((id) => (
              <button key={id} className={`chip ${roles[roleSheet] === id ? "chip-on" : ""}`}
                onClick={() => { setRoles({ ...roles, [roleSheet]: roles[roleSheet] === id ? undefined : id }); setDirty(true); setRoleSheet(null); }}>
                {byId.get(id)?.name}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {weightsOpen && <WeightsSheet sel={sel} matchId={m.id} onClose={() => setWeightsOpen(false)} onSaved={loadSelection} />}
    </>
  );
}

function best(c: Candidate) {
  return Math.max(0, ...Object.values(c.slotScores));
}

function scoreFor(c: Candidate, idx: number) {
  return idx >= BENCH ? best(c) : c.slotScores[idx] ?? 0;
}

function GuestInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="row">
      <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest player name" />
      <button className="btn btn-ghost" disabled={!name.trim()} onClick={() => onAdd(name.trim())}>Add</button>
    </div>
  );
}

/** What the score is made of. Steppers of 5; factors without data yet are shown as "soon". */
function WeightsSheet({ sel, matchId, onClose, onSaved }: { sel: SelectionView; matchId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [w, setW] = useState<Record<Factor, number>>(sel.configured);
  const factors = Object.keys(w) as Factor[];

  async function save() {
    try {
      await api(`/matches/${matchId}/weights`, { method: "PUT", body: { weights: w } });
      toast.show("Scores updated ✓");
      onSaved();
      onClose();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  return (
    <Sheet onClose={onClose}>
      <strong>What counts most for this match?</strong>
      {factors.map((f) => {
        const off = sel.unavailableFactors.includes(f);
        return (
          <div key={f} className="weight-row" style={{ opacity: off ? 0.45 : 1 }}>
            <span>{FACTOR_LABEL[f]}{off && <span className="muted small"> · {OFF_HINT[f]}</span>}</span>
            <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setW({ ...w, [f]: Math.max(0, w[f] - 5) })}>−</button>
            <span className="mono" style={{ textAlign: "center", fontWeight: 700 }}>{w[f]}</span>
            <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setW({ ...w, [f]: Math.min(100, w[f] + 5) })}>+</button>
          </div>
        );
      })}
      <button className="btn btn-primary btn-block" onClick={save}>Use these</button>
    </Sheet>
  );
}
