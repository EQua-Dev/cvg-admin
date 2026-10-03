"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, errorMessage, REASON_LABEL, type Mark, type OutReason, type RosterRow, type SessionDetail } from "@/lib/api";
import { clock, sessionDay } from "@/lib/format";
import { Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge, TopBar } from "@/components/ui";
import { TrainingGate, useTrainingRoles } from "../shared";

interface QueuedMark {
  memberId: string;
  mark: Mark | null;
  markedAt: string;
}

const MARK_TEXT: Record<Mark, string> = { PRESENT: "✓ IN", ABSENT: "✕ OUT", LATE: "◔ LATE", EXCUSED: "— EXC" };
const queueKey = (id: string) => `cvg-marks-${id}`;

function readQueue(id: string): QueuedMark[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(id)) ?? "[]");
  } catch {
    return [];
  }
}

export default function SessionPage() {
  return (
    <TrainingGate>
      <SessionScreen />
    </TrainingGate>
  );
}

function SessionScreen() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { canPlan } = useTrainingRoles();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [tab, setTab] = useState<"availability" | "attendance">("availability");
  const [queue, setQueue] = useState<QueuedMark[]>([]);
  const [sheetFor, setSheetFor] = useState<RosterRow | null>(null);
  const [outFor, setOutFor] = useState<RosterRow | null>(null);
  const syncing = useRef(false);

  const load = useCallback(async () => {
    const d = await api<SessionDetail>(`/training/sessions/${id}`);
    setData(d);
    const today = new Date().toLocaleDateString("en-CA");
    if (d.session.date <= today && d.session.status !== "CANCELLED") setTab("attendance");
  }, [id]);

  useEffect(() => {
    setQueue(readQueue(id));
    load();
  }, [id, load]);

  /** Sends queued taps. Anything that fails stays queued for the next try. */
  const sync = useCallback(async () => {
    const pending = readQueue(id);
    if (syncing.current || pending.length === 0) return;
    syncing.current = true;
    try {
      const d = await api<SessionDetail>(`/training/sessions/${id}/marks`, { method: "PUT", body: { marks: pending } });
      const left = readQueue(id).slice(pending.length);
      localStorage.setItem(queueKey(id), JSON.stringify(left));
      setQueue(left);
      setData(d);
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== "offline") {
        // A real refusal (e.g. closed): drop the queue so it doesn't retry forever.
        toast.show(errorMessage(e), "alert");
        localStorage.removeItem(queueKey(id));
        setQueue([]);
        load();
      }
    } finally {
      syncing.current = false;
    }
  }, [id, toast, load]);

  useEffect(() => {
    sync();
    const t = setInterval(sync, 8000);
    window.addEventListener("online", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", sync);
    };
  }, [sync]);

  // What the screen shows: the server's marks with any unsent taps on top.
  const marks = useMemo(() => {
    const m = new Map<string, Mark | undefined>();
    data?.roster?.forEach((r) => m.set(r.memberId, r.mark));
    queue.forEach((q) => m.set(q.memberId, q.mark ?? undefined));
    return m;
  }, [data, queue]);

  function setMark(memberId: string, mark: Mark | null) {
    const next = [...readQueue(id), { memberId, mark, markedAt: new Date().toISOString() }];
    localStorage.setItem(queueKey(id), JSON.stringify(next));
    setQueue(next);
    if (navigator.vibrate) navigator.vibrate(12);
    sync();
  }

  /** Tap cycles: not marked → in → out → not marked. */
  function tap(r: RosterRow) {
    const cur = marks.get(r.memberId);
    setMark(r.memberId, cur === undefined ? "PRESENT" : cur === "PRESENT" ? "ABSENT" : null);
  }

  async function setAvailability(r: RosterRow, status: "IN" | "OUT", reason?: OutReason) {
    try {
      setData(await api<SessionDetail>(`/training/sessions/${id}/availability/${r.memberId}`, { method: "PUT", body: { status, reason } }));
      toast.show(`${r.fullName.split(" ")[0]}: ${status === "IN" ? "in" : "out"} ✓`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function closeSession() {
    await sync();
    if (readQueue(id).length > 0) {
      toast.show("Waiting for signal to send the last marks.", "alert");
      return;
    }
    const unmarked = (data?.roster ?? []).filter((r) => !marks.get(r.memberId)).length;
    if (!confirm(unmarked ? `Close the session? ${unmarked} not marked will count as absent.` : "Close the session?")) return;
    try {
      setData(await api<SessionDetail>(`/training/sessions/${id}/close`, { method: "POST" }));
      toast.show("Session closed ✓");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function cancelSession() {
    if (!confirm("Cancel this session? It won't count for anyone.")) return;
    try {
      await api(`/training/sessions/${id}/cancel`, { method: "POST" });
      toast.show("Cancelled");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (!data) return <><TopBar back="/training" /><div className="empty"><span className="spinner" /></div></>;
  const s = data.session;
  const roster = data.roster ?? [];
  const markedN = roster.filter((r) => marks.get(r.memberId)).length;
  const today = new Date().toLocaleDateString("en-CA");
  const canMark = s.status !== "CANCELLED" && s.date <= today && (s.status === "SCHEDULED" || canPlan);

  return (
    <>
      <header className="topbar">
        <Link href="/training" className="back">← {s.date === today ? "TODAY" : sessionDay(s.date)} · {clock(s.time)}</Link>
        {queue.length > 0 && <span className="queued" style={{ marginLeft: "auto" }}>⚡ {queue.length} queued</span>}
      </header>
      <main className="page" style={{ gap: 14 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className={`kind kind-${s.kind}`}>{s.impromptu ? "Impromptu · " : ""}{s.kind === "COMPULSORY" ? "Compulsory" : "Optional"}</span>
          <span className="muted">{[s.focus, s.venue].filter(Boolean).join(" · ")}</span>
        </div>

        {s.status === "CANCELLED" && <div className="notice notice-caution">Cancelled.</div>}
        {s.status === "CLOSED" && (
          <div className="notice notice-good">Closed. {canPlan ? "You can still fix marks; changes are logged." : "Ask the coach to change a mark."}</div>
        )}

        {s.status !== "CANCELLED" && (
          <div className="segmented">
            <button className={tab === "availability" ? "on" : ""} onClick={() => setTab("availability")}>Who&apos;s coming · {s.inCount}</button>
            <button className={tab === "attendance" ? "on" : ""} onClick={() => setTab("attendance")}>Attendance</button>
          </div>
        )}

        {tab === "availability" && s.status !== "CANCELLED" && (
          <>
            <span className="small"><strong className="money-in">{s.inCount} in</strong> · {s.outCount} out · tap to change</span>
            <div className="list">
              {roster.map((r) => (
                <div
                  key={r.memberId}
                  className="list-row"
                  style={{ cursor: s.status === "SCHEDULED" ? "pointer" : "default" }}
                  onClick={() => {
                    if (s.status !== "SCHEDULED") return;
                    if (r.availability === "IN") setOutFor(r);
                    else setAvailability(r, "IN");
                  }}
                >
                  <JerseyBadge n={r.jerseyNumber} />
                  <span className="grow">{r.fullName}</span>
                  {r.availability === "IN" ? (
                    <span className="mark-label mark-label-PRESENT">In</span>
                  ) : (
                    <span className="mark-label mark-label-ABSENT">Out{r.reason ? ` · ${REASON_LABEL[r.reason]}` : ""}</span>
                  )}
                </div>
              ))}
            </div>
            {s.status === "SCHEDULED" && canPlan && <button className="btn btn-quiet" onClick={cancelSession}>Cancel this session</button>}
          </>
        )}

        {tab === "attendance" && s.status !== "CANCELLED" && (
          s.date > today ? (
            <div className="empty">You can mark attendance on the day.</div>
          ) : (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="mono small muted">{markedN} marked · {roster.length - markedN} to go</span>
                <div className="progress-bar"><span style={{ width: `${roster.length ? (markedN / roster.length) * 100 : 0}%`, background: "var(--orange)" }} /></div>
                {canMark && <span className="muted small">Tap: in → out → clear. Hold for late or excused.</span>}
              </div>
              <div className="list">
                {roster.map((r) => (
                  <MarkRow
                    key={r.memberId}
                    row={r}
                    mark={marks.get(r.memberId)}
                    disabled={!canMark}
                    onTap={() => tap(r)}
                    onHold={() => setSheetFor(r)}
                  />
                ))}
              </div>
              {s.status === "SCHEDULED" && (
                <div className="sticky-action">
                  <button className="btn btn-primary btn-block" onClick={closeSession}>Close the session</button>
                </div>
              )}
            </>
          )
        )}
      </main>

      {sheetFor && (
        <Sheet onClose={() => setSheetFor(null)}>
          <strong>{sheetFor.fullName}</strong>
          <span className="muted small">Mark as…</span>
          <button className="btn btn-ghost btn-block" style={{ color: "var(--caution)", justifyContent: "flex-start" }} onClick={() => { setMark(sheetFor.memberId, "LATE"); setSheetFor(null); }}>◔ Late (counts as present)</button>
          <button className="btn btn-ghost btn-block" style={{ justifyContent: "flex-start" }} onClick={() => { setMark(sheetFor.memberId, "EXCUSED"); setSheetFor(null); }}>— Excused (doesn&apos;t count)</button>
        </Sheet>
      )}

      {outFor && (
        <Sheet onClose={() => setOutFor(null)}>
          <strong>{outFor.fullName} is out because…</strong>
          <div className="chips">
            {(Object.keys(REASON_LABEL) as OutReason[]).map((reason) => (
              <button key={reason} className="chip" onClick={() => { setAvailability(outFor, "OUT", reason); setOutFor(null); }}>{REASON_LABEL[reason]}</button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

/** One big row. Tap to cycle; press and hold ~half a second for more options. */
function MarkRow({ row, mark, disabled, onTap, onHold }: { row: RosterRow; mark?: Mark; disabled: boolean; onTap: () => void; onHold: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const start = () => {
    if (disabled) return;
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      if (navigator.vibrate) navigator.vibrate(25);
      onHold();
    }, 480);
  };
  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div
      className={`mark-row ${mark ? `mark-${mark}` : ""}`}
      role="button"
      aria-label={`${row.fullName}: ${mark ?? "not marked"}`}
      onPointerDown={start}
      onPointerUp={() => {
        const wasHold = held.current;
        end();
        if (!disabled && !wasHold) onTap();
      }}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <JerseyBadge n={row.jerseyNumber} />
      <span className="grow" style={{ fontWeight: 500 }}>
        {row.fullName}
        {row.availability === "OUT" && <span className="muted small"> · said out</span>}
      </span>
      <span className={`mark-label ${mark ? `mark-label-${mark}` : "muted"}`}>{mark ? MARK_TEXT[mark] : "·"}</span>
    </div>
  );
}
