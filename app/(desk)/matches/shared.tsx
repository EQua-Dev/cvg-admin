"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage, PLAN_NAMES, TYPE_LABEL, type GamePlan, type MatchOptions, type MatchSide, type MatchType, type MatchView } from "@/lib/api";
import { clock, naira, sessionDay, toKobo } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { Field } from "@/components/ui";
import { useTrainingRoles } from "../training/shared";

export { TrainingGate as MatchGate } from "../training/shared";
export const useMatchRoles = useTrainingRoles;

export function MatchCard({ m }: { m: MatchView }) {
  const isToday = m.date === new Date().toLocaleDateString("en-CA");
  return (
    <Link href={`/matches/${m.id}`} className={`card stack ${isToday ? "card-accent" : ""}`} style={{ gap: 6, opacity: m.status === "CANCELLED" ? 0.5 : 1 }}>
      <div className="spread">
        <strong style={{ fontSize: 18 }}>vs {m.opponent}</strong>
        {m.outcome ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{m.ourScore}–{m.theirScore}</span>
            <span className={`outcome outcome-${m.outcome}`}>{m.outcome}</span>
          </span>
        ) : (
          <span className="kind">{TYPE_LABEL[m.type]} · {m.teamSize}s</span>
        )}
      </div>
      <span className="mono small" style={{ fontWeight: 600 }}>{isToday ? "TODAY" : sessionDay(m.date)} · {clock(m.time)} · <span className="muted">{m.venue}</span></span>
      <span className="small">
        {m.status === "CANCELLED" ? "Cancelled" : m.status === "PLAYED" ? (m.potmOpen ? "🗳️ POTM vote open" : "Full time") : (
          <>
            <strong className="money-in">{m.inCount} in</strong> · {m.outCount} out
            {m.lineupPublished ? " · ✓ Lineup out" : m.formation ? " · Lineup draft" : ""}
          </>
        )}
      </span>
    </Link>
  );
}

const SIZES = [5, 7, 9, 11];
const TYPES: MatchType[] = ["FRIENDLY", "LEAGUE", "TOURNAMENT", "INTERNAL"];
const SIDES: MatchSide[] = ["HOME", "AWAY", "NEUTRAL"];

/** One form for new and edit. Mostly taps; only the opponent is typed. */
export function MatchForm({ existing }: { existing?: MatchView }) {
  const router = useRouter();
  const toast = useToast();
  const [opts, setOpts] = useState<MatchOptions | null>(null);
  const today = new Date().toLocaleDateString("en-CA");
  const [opponent, setOpponent] = useState(existing?.opponent ?? "");
  const [date, setDate] = useState(existing?.date ?? today);
  const [kickoff, setKickoff] = useState(existing?.time.slice(0, 5) ?? "16:00");
  const [meet, setMeet] = useState(existing?.meetTime?.slice(0, 5) ?? "");
  const [venue, setVenue] = useState(existing?.venue ?? "");
  const [side, setSide] = useState<MatchSide>(existing?.side ?? "HOME");
  const [type, setType] = useState<MatchType>(existing?.type ?? "FRIENDLY");
  const [size, setSize] = useState(existing?.teamSize ?? 11);
  const [plan, setPlan] = useState<GamePlan | undefined>(existing?.gamePlan);
  const [planB, setPlanB] = useState<GamePlan | undefined>(existing?.planB);
  const [kit, setKit] = useState(existing?.kit ?? "");
  const [fee, setFee] = useState(existing?.feeKobo ? String(existing.feeKobo / 100) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<MatchOptions>("/matches/options").then((o) => {
      setOpts(o);
      if (!existing && o.venues[0]) setVenue((v) => v || o.venues[0]);
    });
  }, [existing]);

  async function save() {
    setBusy(true);
    const body = {
      opponent, date, kickoff, meetTime: meet || null, venue, side, type, teamSize: size,
      gamePlan: plan ?? null, planB: planB ?? null, kit: kit || null, feeKobo: fee ? toKobo(fee) : null, notes: notes || null,
    };
    try {
      const m = existing
        ? await api<MatchView>(`/matches/${existing.id}`, { method: "PUT", body })
        : await api<MatchView>("/matches", { method: "POST", body });
      toast.show(existing ? "Saved ✓" : "Match added ✓");
      router.replace(`/matches/${m.id}`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  return (
    <>
      <Field label="Opponent">
        <input className="input" list="opponents" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Gwarinpa FC" />
        <datalist id="opponents">{opts?.opponents.map((o) => <option key={o} value={o} />)}</datalist>
      </Field>
      {opts && opts.opponents.length > 0 && !opponent && (
        <div className="chips">{opts.opponents.slice(0, 5).map((o) => <button key={o} className="chip" onClick={() => setOpponent(o)}>{o}</button>)}</div>
      )}
      <div className="row">
        <div className="grow"><Field label="Day"><input className="input" type="date" min={existing ? undefined : today} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        <div style={{ width: 120 }}><Field label="Kick-off"><input className="input" type="time" value={kickoff} onChange={(e) => setKickoff(e.target.value)} /></Field></div>
      </div>
      <div className="row">
        <div className="grow">
          <Field label="Where">
            <input className="input" list="venues" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Area 1 Field" />
            <datalist id="venues">{opts?.venues.map((o) => <option key={o} value={o} />)}</datalist>
          </Field>
        </div>
        <div style={{ width: 120 }}><Field label="Meet · optional"><input className="input" type="time" value={meet} onChange={(e) => setMeet(e.target.value)} /></Field></div>
      </div>

      <span className="label">Format</span>
      <div className="segmented">
        {SIZES.map((s) => <button key={s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{s}-a-side</button>)}
      </div>
      <div className="chips">
        {SIDES.map((s) => <button key={s} className={`chip ${side === s ? "chip-on" : ""}`} onClick={() => setSide(s)}>{s[0] + s.slice(1).toLowerCase()}</button>)}
        <span style={{ width: 8 }} />
        {TYPES.map((t) => <button key={t} className={`chip ${type === t ? "chip-on" : ""}`} onClick={() => setType(t)}>{TYPE_LABEL[t]}</button>)}
      </div>

      <span className="label">Game plan</span>
      <div className="chips">
        {opts?.gamePlans.map((g) => (
          <button key={g.code} className={`chip ${plan === g.code ? "chip-on" : ""}`} onClick={() => setPlan(plan === g.code ? undefined : g.code)}>{g.label}</button>
        ))}
      </div>
      {plan && (
        <>
          <span className="label">Plan B · optional</span>
          <div className="chips">
            {opts?.gamePlans.filter((g) => g.code !== plan).map((g) => (
              <button key={g.code} className={`chip ${planB === g.code ? "chip-on" : ""}`} onClick={() => setPlanB(planB === g.code ? undefined : g.code)}>{PLAN_NAMES[g.code]}</button>
            ))}
          </div>
        </>
      )}

      <div className="row">
        <div className="grow"><Field label="Kit · optional"><input className="input" value={kit} onChange={(e) => setKit(e.target.value)} placeholder="e.g. Orange" /></Field></div>
        <div style={{ width: 140 }}><Field label="Fee ₦ · optional"><input className="input input-mono" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" /></Field></div>
      </div>
      {fee && <span className="muted small">Everyone who plays will owe {naira(toKobo(fee))}. A collection starts when you save the result.</span>}
      <Field label="Notes · optional"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <div className="sticky-action">
        <button className="btn btn-primary btn-block" disabled={busy || !opponent.trim() || !venue.trim()} onClick={save}>{existing ? "Save" : "Add match"}</button>
      </div>
    </>
  );
}
