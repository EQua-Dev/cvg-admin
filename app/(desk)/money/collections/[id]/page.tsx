"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage, type CollectionDetail, type DueState, type MemberDue, type Method } from "@/lib/api";
import { dayMonth, dueReminder, firstName, groupReminder, naira, toKobo, whatsappLink } from "@/lib/format";
import { AmountInput, MethodPicker, Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge, TopBar } from "@/components/ui";
import { MoneyGate } from "../../shared";

type Filter = "ALL" | DueState;

const STATE_LABEL: Record<DueState, string> = { PAID: "Paid", PARTIAL: "Part", UNPAID: "Owes" };

export default function CollectionPage() {
  return (
    <MoneyGate>
      <Collection />
    </MoneyGate>
  );
}

function Collection() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<CollectionDetail | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [paying, setPaying] = useState<MemberDue | null>(null);

  const load = useCallback(() => api<CollectionDetail>(`/collections/${id}`).then(setData), [id]);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => (data?.members ?? []).filter((m) => filter === "ALL" || m.state === filter), [data, filter]);

  if (!data) return <><TopBar back="/money" /><div className="empty"><span className="spinner" /></div></>;
  const c = data.summary;
  const pct = c.expectedKobo ? Math.min(100, Math.round((c.collectedKobo / c.expectedKobo) * 100)) : 0;
  const owing = data.members.filter((m) => m.state !== "PAID");

  async function close() {
    if (!confirm(`Close ${c.title}? No more payments can be recorded against it.`)) return;
    try {
      await api(`/collections/${id}/close`, { method: "POST" });
      toast.show("Closed ✓");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  return (
    <>
      <TopBar back="/money" />
      <main className="page">
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h2" style={{ fontSize: 24 }}>{c.title}</h1>
          <span className="muted small">
            {naira(c.amountKobo)} each · due {dayMonth(c.dueDate)}{c.recurring ? " · repeats monthly" : ""}{!c.open ? " · closed" : ""}
          </span>
        </div>

        <div className="card stack" style={{ gap: 10 }}>
          <div className="spread">
            <span className="big-number" style={{ fontSize: 30 }}>{naira(c.collectedKobo)}</span>
            <span className="muted small mono">of {naira(c.expectedKobo)}</span>
          </div>
          <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>
          <span className="small"><strong>{c.paidCount}</strong> of {c.memberCount} paid{c.partialCount ? ` · ${c.partialCount} part-paid` : ""}</span>
        </div>

        {owing.length > 0 && c.open && (
          <a
            className="btn btn-wa btn-block"
            href={whatsappLink(groupReminder(c.title, c.amountKobo, c.dueDate, owing.map((m) => firstName(m))))}
            target="_blank"
            rel="noreferrer"
          >
            Remind the {owing.length} on WhatsApp
          </a>
        )}

        <div className="chips" role="tablist">
          {(["ALL", "UNPAID", "PARTIAL", "PAID"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? "chip-on" : ""}`} onClick={() => setFilter(f)}>
              {f === "ALL" ? `All ${data.members.length}` : `${STATE_LABEL[f as DueState]} ${data.members.filter((m) => m.state === f).length}`}
            </button>
          ))}
        </div>

        {c.open && <span className="muted small">Tap a name to record their payment.</span>}

        <div className="list">
          {rows.map((m) => (
            <div key={m.memberId} className="list-row" style={{ cursor: c.open && m.state !== "PAID" ? "pointer" : "default" }} onClick={() => c.open && m.state !== "PAID" && setPaying(m)}>
              <JerseyBadge n={m.jerseyNumber} />
              <span className="grow">
                <span style={{ display: "block", fontWeight: 600 }} className="ellipsis">{m.fullName}</span>
                <span className="muted small mono">
                  {m.state === "PAID" ? `${naira(m.paidKobo)} paid` : m.state === "PARTIAL" ? `${naira(m.paidKobo)} paid · ${naira(m.owedKobo)} left` : `${naira(m.owedKobo)} to pay`}
                </span>
              </span>
              <span className={`pill pill-${m.state}`}>{STATE_LABEL[m.state]}</span>
              {m.state !== "PAID" && c.open && m.phone && (
                <a
                  className="icon-btn"
                  href={whatsappLink(dueReminder(firstName(m), c.title, m.owedKobo, c.dueDate), m.phone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Remind ${m.fullName} on WhatsApp`}
                  onClick={(e) => e.stopPropagation()}
                >
                  💬
                </a>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="empty">No one here.</div>}
        </div>

        {c.open && <button className="btn btn-quiet" onClick={close}>Close collection</button>}
      </main>

      {paying && (
        <PaySheet
          collectionId={c.id}
          title={c.title}
          member={paying}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </>
  );
}

function PaySheet({
  collectionId,
  title,
  member,
  onClose,
  onDone,
}: {
  collectionId: string;
  title: string;
  member: MemberDue;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState((member.owedKobo / 100).toLocaleString("en-NG"));
  const [method, setMethod] = useState<Method>("CASH");
  const [busy, setBusy] = useState(false);
  const kobo = toKobo(amount);

  async function record() {
    setBusy(true);
    try {
      await api("/ledger/payments", { method: "POST", body: { memberId: member.memberId, collectionId, amountKobo: kobo, method } });
      toast.show(`${naira(kobo)} from ${firstName(member)} ✓`);
      onDone();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="row">
        <JerseyBadge n={member.jerseyNumber} />
        <div className="grow">
          <strong>{member.fullName}</strong>
          <div className="muted small">{title} · {naira(member.owedKobo)} left</div>
        </div>
      </div>
      <AmountInput value={amount} onChange={setAmount} quick={member.owedKobo > 0 ? [member.owedKobo, Math.round(member.owedKobo / 2)] : []} />
      <MethodPicker value={method} onChange={setMethod} />
      {kobo > member.owedKobo && member.owedKobo > 0 && (
        <span className="notice notice-caution small">That&apos;s more than they owe ({naira(member.owedKobo)}).</span>
      )}
      <button className="btn btn-primary btn-block" disabled={kobo <= 0 || busy} onClick={record}>
        {busy ? "Recording…" : `Record ${naira(kobo)} paid`}
      </button>
    </Sheet>
  );
}
