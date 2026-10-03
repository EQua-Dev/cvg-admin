"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage, type MatchDetail, type SquadRow } from "@/lib/api";
import { resultMessage, whatsappLink } from "@/lib/format";
import { Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge } from "@/components/ui";
import { useMatchRoles } from "../shared";

interface Player {
  key: string;
  memberId?: string;
  guestName?: string;
  name: string;
  jerseyNumber?: number;
  position?: string;
  started: boolean;
  played: boolean;
}

interface GoalDraft {
  scorer?: string; // player key, or "OG"
  assist?: string;
  minute?: string;
}

function initialPlayers(d: MatchDetail, squad: SquadRow[]): Player[] {
  if (d.result) {
    return d.result.appearances.map((a) => ({
      key: a.person.memberId ?? `g:${a.person.guestName}`, memberId: a.person.memberId, guestName: a.person.guestName,
      name: a.person.name, jerseyNumber: a.person.jerseyNumber, position: a.position, started: a.started, played: true,
    }));
  }
  if (d.lineup) {
    const starters = d.lineup.slots.filter((s) => s.memberId || s.guestName).map((s) => ({ s, started: true }));
    const bench = d.lineup.bench.filter((s) => s.memberId || s.guestName).map((s) => ({ s, started: false }));
    return [...starters, ...bench].map(({ s, started }) => ({
      key: s.memberId ?? `g:${s.guestName}`, memberId: s.memberId, guestName: s.guestName, name: s.name ?? "",
      jerseyNumber: s.jerseyNumber, position: started ? s.position : undefined, started, played: started,
    }));
  }
  return squad.filter((r) => r.availability === "IN").map((r) => ({
    key: r.memberId, memberId: r.memberId, name: r.nickname ?? r.fullName, jerseyNumber: r.jerseyNumber, position: r.position, started: true, played: false,
  }));
}

/** Score, who played, who scored. Then the POTM vote and opinions. */
export function ResultTab({ data, onChange }: { data: MatchDetail; onChange: () => void }) {
  const { canPlan } = useMatchRoles();
  const [editing, setEditing] = useState(!data.result);
  if (data.result && !editing) return <Summary data={data} onEdit={canPlan ? () => setEditing(true) : undefined} onChange={onChange} />;
  if (!canPlan) return <div className="empty">The coach enters the result.</div>;
  return <ResultForm data={data} onSaved={() => { setEditing(false); onChange(); }} />;
}

function ResultForm({ data, onSaved }: { data: MatchDetail; onSaved: () => void }) {
  const toast = useToast();
  const m = data.match;
  const [squad, setSquad] = useState<SquadRow[] | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [our, setOur] = useState(data.result?.ourScore ?? 0);
  const [their, setTheir] = useState(data.result?.theirScore ?? 0);
  const [goals, setGoals] = useState<GoalDraft[]>(() => (data.result?.goals ?? []).map((g) => ({
    scorer: g.ownGoal ? "OG" : g.scorer?.memberId ?? (g.scorer ? `g:${g.scorer.guestName}` : undefined),
    assist: g.assist?.memberId ?? (g.assist ? `g:${g.assist.guestName}` : undefined),
    minute: g.minute ? String(g.minute) : "",
  })));
  const [picker, setPicker] = useState<{ goal: number; what: "scorer" | "assist" } | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SquadRow[]>(`/matches/${m.id}/squad`).then((s) => {
      setSquad(s);
      setPlayers(initialPlayers(data, s));
    });
  }, [m.id, data]);

  function setScore(n: number) {
    const v = Math.max(0, Math.min(30, n));
    setOur(v);
    setGoals((g) => (v > g.length ? [...g, ...Array.from({ length: v - g.length }, () => ({}))] : g.slice(0, v)));
  }

  if (!players || !squad) return <div className="empty"><span className="spinner" /></div>;
  const played = players.filter((p) => p.played);
  const name = (key?: string) => (key === "OG" ? "Own goal" : players.find((p) => p.key === key)?.name);

  function toggle(p: Player) {
    setPlayers((list) => list!.map((x) => (x.key === p.key ? { ...x, played: !x.played } : x)));
  }

  async function save() {
    const missing = goals.findIndex((g) => !g.scorer);
    if (missing >= 0) {
      toast.show(`Goal ${missing + 1}: who scored?`, "alert");
      return;
    }
    setBusy(true);
    const ref = (key?: string) => {
      const p = players!.find((x) => x.key === key);
      return p?.memberId ? { id: p.memberId } : p?.guestName ? { guest: p.guestName } : {};
    };
    try {
      await api(`/matches/${m.id}/result`, {
        method: "PUT",
        body: {
          ourScore: our,
          theirScore: their,
          appearances: played.map((p) => ({ memberId: p.memberId, guestName: p.guestName, started: p.started, position: p.position })),
          goals: goals.map((g) => {
            const s = ref(g.scorer);
            const a = ref(g.assist);
            return {
              ownGoal: g.scorer === "OG", scorerId: s.id, scorerGuest: s.guest, assistId: a.id, assistGuest: a.guest,
              minute: g.minute ? Number(g.minute) : null,
            };
          }),
        },
      });
      toast.show(data.result ? "Result corrected ✓" : "Saved ✓ POTM vote is open");
      onSaved();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  const notListed = squad.filter((r) => !players.some((p) => p.memberId === r.memberId));

  return (
    <>
      <div className="vs card">
        <div className="score-box">
          <span className="label">CVG</span>
          <span className="score-big">{our}</span>
          <div className="stepper">
            <button className="icon-btn" onClick={() => setScore(our - 1)} aria-label="CVG minus">−</button>
            <button className="icon-btn" onClick={() => setScore(our + 1)} aria-label="CVG plus">+</button>
          </div>
        </div>
        <span className="muted" style={{ fontSize: 24 }}>–</span>
        <div className="score-box">
          <span className="label ellipsis" style={{ maxWidth: 120 }}>{m.opponent}</span>
          <span className="score-big">{their}</span>
          <div className="stepper">
            <button className="icon-btn" onClick={() => setTheir(Math.max(0, their - 1))} aria-label="Them minus">−</button>
            <button className="icon-btn" onClick={() => setTheir(their + 1)} aria-label="Them plus">+</button>
          </div>
        </div>
      </div>

      {goals.length > 0 && (
        <>
          <span className="label">Our goals</span>
          <div className="list">
            {goals.map((g, i) => (
              <div key={i} className="list-row" style={{ gap: 8 }}>
                <span className="mono muted" style={{ width: 22 }}>⚽{i + 1}</span>
                <button className={`chip ${g.scorer ? "chip-on" : ""}`} onClick={() => setPicker({ goal: i, what: "scorer" })}>{name(g.scorer) ?? "Scorer?"}</button>
                {g.scorer !== "OG" && (
                  <button className="chip" onClick={() => setPicker({ goal: i, what: "assist" })} style={{ opacity: g.assist ? 1 : 0.6 }}>
                    {g.assist ? `🅰 ${name(g.assist)}` : "+ assist"}
                  </button>
                )}
                <input className="input input-mono" style={{ width: 56, height: 40, marginLeft: "auto", padding: "0 8px" }} inputMode="numeric" placeholder="min"
                  value={g.minute ?? ""} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, minute: e.target.value.replace(/\D/g, "").slice(0, 3) } : x)))} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="spread">
        <span className="label">Who played · {played.length}</span>
        <button className="btn btn-quiet" onClick={() => setAdding(true)}>+ Add</button>
      </div>
      <div className="list">
        {players.map((p) => (
          <div key={p.key} className={`mark-row ${p.played ? "mark-PRESENT" : ""}`} onClick={() => toggle(p)} role="button" aria-pressed={p.played}>
            <JerseyBadge n={p.jerseyNumber} />
            <span className="grow">{p.name}{p.guestName && <span className="muted small"> · guest</span>}</span>
            <span className="muted small">{p.started ? p.position ?? "" : "sub"}</span>
            <span className={`mark-label ${p.played ? "mark-label-PRESENT" : "muted"}`}>{p.played ? "✓" : p.started ? "·" : "came on?"}</span>
          </div>
        ))}
      </div>

      <div className="sticky-action">
        <button className="btn btn-primary btn-block" disabled={busy || played.length === 0} onClick={save}>{data.result ? "Save correction" : "Save result"}</button>
      </div>

      {picker && (
        <Sheet onClose={() => setPicker(null)}>
          <strong>Goal {picker.goal + 1}: {picker.what === "scorer" ? "who scored?" : "who assisted?"}</strong>
          <div className="chips">
            {played.filter((p) => picker.what === "scorer" || p.key !== goals[picker.goal].scorer).map((p) => (
              <button key={p.key} className="chip" onClick={() => {
                setGoals(goals.map((x, j) => (j === picker.goal ? { ...x, [picker.what]: p.key, ...(picker.what === "scorer" && x.assist === p.key ? { assist: undefined } : {}) } : x)));
                setPicker(null);
              }}>{p.name}</button>
            ))}
            {picker.what === "scorer" ? (
              <button className="chip" onClick={() => { setGoals(goals.map((x, j) => (j === picker.goal ? { scorer: "OG", minute: x.minute } : x))); setPicker(null); }}>Own goal (theirs)</button>
            ) : (
              <button className="chip" onClick={() => { setGoals(goals.map((x, j) => (j === picker.goal ? { ...x, assist: undefined } : x))); setPicker(null); }}>No assist</button>
            )}
          </div>
        </Sheet>
      )}

      {adding && (
        <Sheet onClose={() => setAdding(false)}>
          <strong>Who else played?</strong>
          <div className="chips">
            {notListed.map((r) => (
              <button key={r.memberId} className="chip" onClick={() => {
                setPlayers([...players, { key: r.memberId, memberId: r.memberId, name: r.nickname ?? r.fullName, jerseyNumber: r.jerseyNumber, started: false, played: true }]);
                setAdding(false);
              }}>{r.nickname ?? r.fullName}</button>
            ))}
          </div>
          <GuestAdd onAdd={(g) => { setPlayers([...players, { key: `g:${g}`, guestName: g, name: g, started: false, played: true }]); setAdding(false); }} />
        </Sheet>
      )}
    </>
  );
}

function GuestAdd({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="row">
      <input className="input grow" value={v} onChange={(e) => setV(e.target.value)} placeholder="Guest player name" />
      <button className="btn btn-ghost" disabled={!v.trim()} onClick={() => onAdd(v.trim())}>Add</button>
    </div>
  );
}

function hoursLeft(iso?: string) {
  if (!iso) return "";
  const h = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
  return h >= 1 ? `${h}h left` : "closing soon";
}

function Summary({ data, onEdit, onChange }: { data: MatchDetail; onEdit?: () => void; onChange: () => void }) {
  const toast = useToast();
  const { canPlan } = useMatchRoles();
  const m = data.match;
  const r = data.result!;
  const potm = data.potm!;
  const ops = data.opinions;
  const scorers = r.goals.map((g) => (g.ownGoal ? "OG" : g.scorer?.name ?? "?"));
  const grouped = Object.entries(scorers.reduce<Record<string, number>>((a, n) => ({ ...a, [n]: (a[n] ?? 0) + 1 }), {})).map(([n, c]) => (c > 1 ? `${n} ×${c}` : n));

  async function closeVote() {
    if (!confirm("Close the vote now?")) return;
    try {
      await api(`/matches/${m.id}/potm/close`, { method: "POST" });
      toast.show("Vote closed ✓");
      onChange();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  const maxTag = Math.max(1, ...(ops?.tags ?? []).flatMap((t) => [t.praised, t.criticised]));

  return (
    <>
      <div className="card stack" style={{ gap: 10, alignItems: "center", textAlign: "center" }}>
        <span className="label">Full time</span>
        <span className="score-big">{r.ourScore} – {r.theirScore}</span>
        {grouped.length > 0 && <span className="small">⚽ {grouped.join(", ")}</span>}
        {r.cleanSheets.length > 0 && <span className="muted small">🧤 Clean sheet</span>}
        <div className="row">
          <a className="btn btn-wa btn-sm" target="_blank" rel="noreferrer" href={whatsappLink(resultMessage(m.opponent, r.ourScore, r.theirScore, grouped))}>Share</a>
          {onEdit && <button className="btn btn-ghost btn-sm" onClick={onEdit}>Correct</button>}
        </div>
        {r.feeCollectionId && <Link href={`/money/collections/${r.feeCollectionId}`} className="btn btn-quiet">Match fee collection →</Link>}
      </div>

      <span className="label">Player of the Match</span>
      <div className="card stack" style={{ gap: 10 }}>
        {potm.open ? (
          <>
            <div className="spread">
              <span><strong className="mono">{potm.votesCast}</strong> of {potm.voters} voted</span>
              <span className="muted small">{hoursLeft(potm.closesAt)}</span>
            </div>
            <div className="progress-bar"><span style={{ width: `${potm.voters ? (potm.votesCast / potm.voters) * 100 : 0}%`, background: "var(--orange)" }} /></div>
            <span className="muted small">Totals show when it closes.</span>
            {canPlan && <button className="btn btn-ghost btn-sm" onClick={closeVote}>Close vote now</button>}
          </>
        ) : potm.winners.length === 0 ? (
          <span className="muted">No votes.</span>
        ) : (
          <>
            <strong style={{ fontSize: 20 }}>🏆 {potm.winners.map((w) => w.name).join(" & ")}{potm.winners.length > 1 ? " (joint)" : ""}</strong>
            {potm.tally?.map((t) => (
              <div key={t.memberId} className="spread small"><span>{t.name}</span><span className="mono">{t.votes}</span></div>
            ))}
          </>
        )}
      </div>

      {ops && (
        <>
          <span className="label">What the squad said · {ops.count}</span>
          {ops.count === 0 ? (
            <div className="card muted small">Nothing yet. Players give their view in the Club app.</div>
          ) : (
            <>
              <div className="card stack" style={{ gap: 8 }}>
                <div className="tag-bar small muted"><span style={{ justifySelf: "end" }}>👍 well</span><span /><span>to fix 👎</span></div>
                {ops.tags.map((t) => (
                  <div key={t.tag} className="tag-bar">
                    <span className="pos" style={{ width: `${(t.praised / maxTag) * 100}%` }} title={`${t.praised}`} />
                    <span style={{ fontWeight: 600, textAlign: "center", minWidth: 96 }}>{t.tag}<span className="muted mono small"> {t.praised}/{t.criticised}</span></span>
                    <span className="neg" style={{ width: `${(t.criticised / maxTag) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="list">
                {ops.items.map((o, i) => (
                  <div key={i} className="list-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
                    <span className="small" style={{ fontWeight: 600 }}>{o.authorName ?? "A teammate"}{o.selfRating ? <span className="muted"> · rates self {o.selfRating}/10</span> : null}</span>
                    {o.commendTags.length > 0 && <span className="small money-in">👍 {o.commendTags.join(", ")}{o.commendText ? ` — ${o.commendText}` : ""}</span>}
                    {o.critiqueTags.length > 0 && <span className="small money-out">👎 {o.critiqueTags.join(", ")}{o.critiqueText ? ` — ${o.critiqueText}` : ""}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
