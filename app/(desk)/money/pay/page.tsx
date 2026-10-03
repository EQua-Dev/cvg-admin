"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, type CollectionSummary, type Member, type Method } from "@/lib/api";
import { firstName, naira, toKobo } from "@/lib/format";
import { AmountInput, MethodPicker } from "@/components/money";
import { useToast } from "@/components/Toast";
import { Field, JerseyBadge, TopBar } from "@/components/ui";
import { MoneyGate } from "../shared";

type For = { kind: "collection"; c: CollectionSummary } | { kind: "DONATION" } | { kind: "OTHER" };

export default function PayPage() {
  return (
    <MoneyGate>
      <Pay />
    </MoneyGate>
  );
}

function Pay() {
  const router = useRouter();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [query, setQuery] = useState("");
  const [who, setWho] = useState<Member | null>(null);
  const [noMember, setNoMember] = useState(false);
  const [forWhat, setForWhat] = useState<For | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Member[]>("/members").then((all) => setMembers(all.filter((m) => m.status !== "LEFT")));
    api<CollectionSummary[]>("/collections?open=true").then(setCollections);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members.filter((m) => m.fullName.toLowerCase().includes(q) || m.nickname?.toLowerCase().includes(q) || String(m.jerseyNumber ?? "") === q);
  }, [members, query]);

  const kobo = toKobo(amount);
  const picked = who !== null || noMember;
  const ready = picked && forWhat && kobo > 0 && !(forWhat.kind === "collection" && !who);

  async function record() {
    setBusy(true);
    try {
      await api("/ledger/payments", {
        method: "POST",
        body: {
          memberId: who?.id ?? null,
          collectionId: forWhat?.kind === "collection" ? forWhat.c.id : null,
          category: forWhat?.kind === "collection" ? null : forWhat?.kind,
          amountKobo: kobo,
          method,
          note: note || null,
        },
      });
      toast.show(`${naira(kobo)} in ✓`);
      router.replace(forWhat?.kind === "collection" ? `/money/collections/${forWhat.c.id}` : "/money/ledger");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back="/money" />
      <main className="page">
        <h1 className="h1">Money in</h1>

        <section className="stack">
          <span className="label">From</span>
          {who ? (
            <button className="card row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => { setWho(null); setForWhat(null); }}>
              <JerseyBadge n={who.jerseyNumber} />
              <strong className="grow">{who.fullName}</strong>
              <span className="muted small">Change</span>
            </button>
          ) : noMember ? (
            <button className="card spread" style={{ cursor: "pointer" }} onClick={() => setNoMember(false)}>
              <strong>Someone outside the squad</strong><span className="muted small">Change</span>
            </button>
          ) : (
            <>
              <input className="input" type="search" placeholder="Name or jersey" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              <div className="list">
                {matches.map((m) => (
                  <button key={m.id} className="list-row" style={{ width: "100%", border: "none", background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => setWho(m)}>
                    <JerseyBadge n={m.jerseyNumber} />
                    <span className="grow">{m.fullName}</span>
                  </button>
                ))}
              </div>
              <button className="btn btn-quiet" onClick={() => { setNoMember(true); setForWhat({ kind: "DONATION" }); }}>Someone outside the squad</button>
            </>
          )}
        </section>

        {picked && (
          <section className="stack">
            <span className="label">For</span>
            <div className="chips">
              {who && collections.map((c) => (
                <button
                  key={c.id}
                  className={`chip ${forWhat?.kind === "collection" && forWhat.c.id === c.id ? "chip-on" : ""}`}
                  onClick={() => { setForWhat({ kind: "collection", c }); setAmount((c.amountKobo / 100).toLocaleString("en-NG")); }}
                >
                  {c.title}
                </button>
              ))}
              <button className={`chip ${forWhat?.kind === "DONATION" ? "chip-on" : ""}`} onClick={() => setForWhat({ kind: "DONATION" })}>Donation</button>
              <button className={`chip ${forWhat?.kind === "OTHER" ? "chip-on" : ""}`} onClick={() => setForWhat({ kind: "OTHER" })}>Other</button>
            </div>
          </section>
        )}

        {forWhat && (
          <>
            <section className="stack">
              <span className="label">Amount</span>
              <AmountInput value={amount} onChange={setAmount} />
            </section>
            <MethodPicker value={method} onChange={setMethod} />
            <Field label="Note · optional">
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={forWhat.kind === "DONATION" ? "e.g. For new balls" : ""} maxLength={200} />
            </Field>
          </>
        )}

        <div className="sticky-action">
          <button className="btn btn-primary btn-block" disabled={!ready || busy} onClick={record}>
            {busy ? "Recording…" : kobo > 0 ? `Record ${naira(kobo)}${who ? ` from ${firstName(who)}` : ""}` : "Record"}
          </button>
        </div>
      </main>
    </>
  );
}
