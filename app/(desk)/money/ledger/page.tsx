"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, METHOD_LABEL, upload, type Entry, type LedgerMonth } from "@/lib/api";
import { naira } from "@/lib/format";
import { shrinkPhoto } from "@/lib/image";
import { PhotoButton, Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/ui";
import { MoneyGate, MoneyTabs } from "../shared";

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function dayLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** "Dues · Kola Bello" or "Field rental · Area 1 field". */
function entryTitle(e: Entry): string {
  const what = e.collection?.name ?? e.categoryLabel;
  const who = e.member?.name ?? e.note;
  return who ? `${what} · ${who}` : what;
}

export default function LedgerPage() {
  return (
    <MoneyGate>
      <Ledger />
    </MoneyGate>
  );
}

function Ledger() {
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<LedgerMonth | null>(null);
  const [open, setOpen] = useState<Entry | null>(null);

  const load = useCallback(async (m: string | null) => {
    setData(await api<LedgerMonth>(`/ledger${m ? `?month=${m}` : ""}`));
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const current = data?.month ?? month;
  const byDay = (data?.entries ?? []).reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.occurredOn] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <TopBar />
      <main className="page" style={{ gap: 14 }}>
        <MoneyTabs active="ledger" />

        <div className="spread">
          <button className="icon-btn" onClick={() => current && setMonth(shiftMonth(current, -1))} aria-label="Previous month">‹</button>
          <strong>{current ? monthLabel(current) : "…"}</strong>
          <button className="icon-btn" onClick={() => current && setMonth(shiftMonth(current, 1))} aria-label="Next month">›</button>
        </div>

        {data && (
          <div className="row">
            <div className="card grow" style={{ borderLeft: "3px solid var(--good)", padding: 12 }}>
              <span className="label">In</span>
              <div className="mono money-in" style={{ fontSize: 20, fontWeight: 600 }}>{naira(data.inKobo)}</div>
            </div>
            <div className="card grow" style={{ borderLeft: "3px solid var(--alert)", padding: 12 }}>
              <span className="label">Out</span>
              <div className="mono money-out" style={{ fontSize: 20, fontWeight: 600 }}>{naira(data.outKobo)}</div>
            </div>
          </div>
        )}
        {data && data.flaggedCount > 0 && (
          <div className="notice notice-caution small">⚠ {data.flaggedCount} expense{data.flaggedCount > 1 ? "s" : ""} without a receipt this month</div>
        )}

        {!data ? (
          <div className="empty"><span className="spinner" /></div>
        ) : data.entries.length === 0 ? (
          <div className="empty">Nothing recorded this month.</div>
        ) : (
          <div className="list">
            {Object.entries(byDay).map(([day, list]) => (
              <div key={day}>
                <div className="day-head">{dayLabel(day)}</div>
                {list.map((e) => (
                  <button
                    key={e.id}
                    className="list-row"
                    style={{ width: "100%", border: "none", background: "none", textAlign: "left", cursor: "pointer" }}
                    onClick={() => setOpen(e)}
                  >
                    <span className={`grow ellipsis ${e.reversed ? "struck" : ""}`}>
                      {e.reversesId ? "↺ " : ""}{entryTitle(e)}
                    </span>
                    <span className={`mono ${e.direction === "IN" ? "money-in" : "money-out"} ${e.reversed ? "struck" : ""}`} style={{ fontWeight: 600 }}>
                      {e.direction === "IN" ? "+" : "−"}{naira(e.amountKobo)}
                    </span>
                    <span style={{ width: 20, textAlign: "center" }} aria-label={e.flagged ? "No receipt" : e.hasReceipt ? "Has receipt" : undefined}>
                      {e.flagged ? "⚠" : e.hasReceipt ? "📎" : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {data && (
          <div className="card spread">
            <span className="label">Club balance</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{naira(data.balanceKobo)}</span>
          </div>
        )}
      </main>

      {open && (
        <EntrySheet
          entry={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null);
            load(current);
          }}
        />
      )}
    </>
  );
}

function EntrySheet({ entry: e, onClose, onChanged }: { entry: Entry; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState("");

  async function addReceipt(file: File) {
    setBusy(true);
    try {
      await upload(`/ledger/${e.id}/receipt`, await shrinkPhoto(file).catch(() => file));
      toast.show("Receipt added ✓");
      onChanged();
    } catch (err) {
      toast.show(errorMessage(err), "alert");
      setBusy(false);
    }
  }

  async function reverse() {
    setBusy(true);
    try {
      await api(`/ledger/${e.id}/reverse`, { method: "POST", body: { reason } });
      toast.show("Reversed ✓");
      onChanged();
    } catch (err) {
      toast.show(errorMessage(err), "alert");
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="spread">
        <span className="label">{e.direction === "IN" ? "Money in" : "Money out"}</span>
        <span className={`mono ${e.direction === "IN" ? "money-in" : "money-out"}`} style={{ fontSize: 26, fontWeight: 700 }}>
          {e.direction === "IN" ? "+" : "−"}{naira(e.amountKobo)}
        </span>
      </div>
      <div className="card" style={{ padding: "4px 16px" }}>
        <div className="kv"><span className="muted">For</span><span>{e.collection?.name ?? e.categoryLabel}</span></div>
        {e.member && <div className="kv"><span className="muted">Member</span><span>{e.member.name}</span></div>}
        {e.note && <div className="kv"><span className="muted">Note</span><span style={{ textAlign: "right" }}>{e.note}</span></div>}
        <div className="kv"><span className="muted">How</span><span>{METHOD_LABEL[e.method]} · {dayLabel(e.occurredOn)}</span></div>
        <div className="kv"><span className="muted">Recorded by</span><span>{e.recordedBy ?? "—"}</span></div>
      </div>
      {e.reversed && <div className="notice notice-caution small">This entry was reversed.</div>}

      {e.hasReceipt ? (
        <a className="btn btn-ghost btn-block" href={`/api/ledger/${e.id}/receipt`} target="_blank" rel="noreferrer">📎 View receipt</a>
      ) : (
        !e.reversesId && <PhotoButton label="📷 Add receipt" onFile={addReceipt} busy={busy} />
      )}

      {!e.reversed && !e.reversesId && (
        reversing ? (
          <div className="stack">
            <input className="input" placeholder="Why? e.g. Wrong person" value={reason} onChange={(ev) => setReason(ev.target.value)} autoFocus maxLength={150} />
            <button className="btn btn-danger btn-block" disabled={!reason.trim() || busy} onClick={reverse}>
              Reverse {naira(e.amountKobo)}
            </button>
            <span className="muted small">Nothing is deleted. A correcting entry is added and both stay on the ledger.</span>
          </div>
        ) : (
          <button className="btn btn-quiet" onClick={() => setReversing(true)}>Made a mistake? Reverse it</button>
        )
      )}
    </Sheet>
  );
}
