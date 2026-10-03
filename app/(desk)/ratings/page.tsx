"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, GROUP_LABEL, TIER_LABEL, type CardView, type PositionGroup, type RatingWindowView, type StatSetsView } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge, TopBar } from "@/components/ui";
import { useSession } from "@/components/Session";

const TIER_COLOR: Record<string, string> = { BRONZE: "#8d6449", SILVER: "#7f898d", GOLD: "#9c7b33", ELITE: "var(--orange)" };

/** Coach/admin: open and close rating rounds, see completion (never who rated whom), card stats per group. */
export default function RatingsPage() {
  const toast = useToast();
  const { me } = useSession();
  const canRun = me.member.roles.some((r) => r === "ADMIN" || r === "COACH");
  const [windows, setWindows] = useState<RatingWindowView[] | null>(null);
  const [sets, setSets] = useState<StatSetsView | null>(null);
  const [cards, setCards] = useState<CardView[]>([]);
  const [days, setDays] = useState(7);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<PositionGroup | null>(null);

  const load = useCallback(() => {
    if (canRun) api<RatingWindowView[]>("/ratings/windows").then(setWindows);
    api<StatSetsView>("/ratings/stat-sets").then(setSets);
    api<CardView[]>("/cards").then(setCards);
  }, [canRun]);

  useEffect(() => {
    load();
  }, [load]);

  async function open() {
    try {
      await api("/ratings/windows", { method: "POST", body: { days, title: title || null } });
      toast.show("Ratings open ✓ Players see it on their home screen");
      setTitle("");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function close(w: RatingWindowView) {
    if (!confirm(`Close "${w.title}" and make the cards?`)) return;
    try {
      await api(`/ratings/windows/${w.id}/close`, { method: "POST" });
      toast.show("Closed ✓ Cards are out");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (!canRun) return <><TopBar back="/" /><main className="page"><div className="empty">Ratings are run by the coach and admins.</div></main></>;
  if (!windows || !sets) return <><TopBar back="/" /><div className="empty"><span className="spinner" /></div></>;
  const current = windows.find((w) => w.open);
  const published = cards.filter((c) => c.published);

  return (
    <>
      <TopBar back="/" />
      <main className="page">
        <h1 className="h1">FUT ratings</h1>

        {current ? (
          <div className="card card-accent stack" style={{ gap: 10 }}>
            <div className="spread">
              <strong>{current.title}</strong>
              <span className="muted small">until {shortDate(current.closesAt.slice(0, 10))}</span>
            </div>
            <span><strong className="mono" style={{ fontSize: 22 }}>{current.finished}</strong> of {current.raters} have rated everyone</span>
            <div className="progress-bar"><span style={{ display: "block", height: "100%", width: `${(current.finished / Math.max(1, current.raters)) * 100}%`, background: "var(--orange)" }} /></div>
            <span className="muted small">Secret: nobody, admins included, sees who gave what.</span>
            <button className="btn btn-ghost btn-sm" onClick={() => close(current)}>Close now and make cards</button>
          </div>
        ) : (
          <div className="card stack" style={{ gap: 10 }}>
            <strong>Open a rating round</strong>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name (optional), e.g. Pre-season" />
            <div className="segmented">
              {[3, 7, 14].map((d) => <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>{d} days</button>)}
            </div>
            <span className="muted small">Every active player rates everyone on 20 things. About 20 taps each.</span>
            <button className="btn btn-primary btn-block" onClick={open}>Open ratings</button>
          </div>
        )}

        <span className="label">Card stats</span>
        <div className="list">
          {sets.sets.map((s) => (
            <button key={s.group} className="list-row" style={{ width: "100%", border: 0, background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => setEditing(s.group)}>
              <span className="grow stack" style={{ gap: 2 }}>
                <strong>{GROUP_LABEL[s.group]}</strong>
                <span className="mono small muted">{s.labels.join(" · ")}</span>
              </span>
              <span className="muted">✎</span>
            </button>
          ))}
        </div>

        {cards.length > 0 && (
          <>
            <span className="label">Cards · {cards[0].round} · {published.length} out</span>
            <div className="list">
              {cards.map((c) => (
                <div key={c.memberId} className="list-row">
                  <JerseyBadge n={c.jerseyNumber} />
                  <span className="grow">
                    {c.fullName}
                    <br />
                    <span className="muted small">{c.position ?? "—"}{c.bestGroup ? ` · best in ${c.bestGroup}` : ""}</span>
                  </span>
                  {c.published && c.tier ? (
                    <>
                      <span className="small" style={{ color: TIER_COLOR[c.tier], fontWeight: 700 }}>{TIER_LABEL[c.tier]}</span>
                      <strong className="mono" style={{ fontSize: 20, minWidth: 30, textAlign: "right" }}>{c.ovr}</strong>
                    </>
                  ) : (
                    <span className="muted small">Not enough ratings</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {windows.filter((w) => !w.open).length > 0 && (
          <>
            <span className="label">Past rounds</span>
            <div className="list">
              {windows.filter((w) => !w.open).map((w) => (
                <div key={w.id} className="list-row">
                  <span className="grow">{w.title}</span>
                  <span className="muted small">{w.cards ?? 0} cards · {w.finished}/{w.raters} finished</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {editing && <StatSetSheet sets={sets} group={editing} onClose={() => setEditing(null)} onSaved={(s) => { setSets(s); load(); }} />}
    </>
  );
}

function StatSetSheet({ sets, group, onClose, onSaved }: { sets: StatSetsView; group: PositionGroup; onClose: () => void; onSaved: (s: StatSetsView) => void }) {
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>(sets.sets.find((s) => s.group === group)!.attrs);

  function toggle(code: string) {
    setPicked((p) => (p.includes(code) ? p.filter((x) => x !== code) : p.length >= 6 ? p : [...p, code]));
  }

  async function save() {
    try {
      onSaved(await api<StatSetsView>(`/ratings/stat-sets/${group}`, { method: "PUT", body: { attrs: picked } }));
      toast.show("Card stats updated ✓ No re-vote needed");
      onClose();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  return (
    <Sheet onClose={onClose}>
      <strong>{GROUP_LABEL[group]}: pick 6 · {picked.length}/6</strong>
      <div className="chips">
        {sets.attributes.map((a) => (
          <button key={a.code} className={`chip ${picked.includes(a.code) ? "chip-on" : ""}`} onClick={() => toggle(a.code)}>{a.title}</button>
        ))}
      </div>
      <button className="btn btn-primary btn-block" disabled={picked.length !== 6} onClick={save}>Save</button>
    </Sheet>
  );
}
