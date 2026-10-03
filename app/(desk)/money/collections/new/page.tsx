"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, type Audience, type Category, type CollectionSummary, type Member } from "@/lib/api";
import { naira, toKobo } from "@/lib/format";
import { AmountInput } from "@/components/money";
import { useToast } from "@/components/Toast";
import { Field, JerseyBadge, TopBar } from "@/components/ui";
import { MoneyGate } from "../../shared";

const TYPES: { value: Category; label: string; amount?: number }[] = [
  { value: "DUES", label: "Monthly dues", amount: 200000 },
  { value: "CDC", label: "CDC", amount: 300000 },
  { value: "TOURNAMENT_FEE", label: "Tournament fee" },
  { value: "KIT", label: "Kit / jersey" },
  { value: "WELFARE", label: "Welfare" },
  { value: "OTHER", label: "Other" },
];

function endOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default function NewCollectionPage() {
  return (
    <MoneyGate>
      <NewCollection />
    </MoneyGate>
  );
}

function NewCollection() {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<Category>("DUES");
  const [recurring, setRecurring] = useState(true);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("2,000");
  const [dueDate, setDueDate] = useState(endOfMonth());
  const [audience, setAudience] = useState<Audience>("ACTIVE");
  const [picked, setPicked] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Member[]>("/members").then((all) => setMembers(all.filter((m) => m.status === "ACTIVE" || m.status === "TRIALIST")));
  }, []);

  const count = useMemo(() => {
    if (audience === "SELECTED") return picked.length;
    return members.filter((m) => audience === "ACTIVE_AND_TRIALISTS" || m.status === "ACTIVE").length;
  }, [audience, picked, members]);

  const isDues = type === "DUES";
  const kobo = toKobo(amount);
  const ready = kobo > 0 && count > 0 && (isDues && recurring ? true : title.trim().length > 0) && dueDate;

  async function save() {
    setBusy(true);
    try {
      const c = await api<CollectionSummary>("/collections", {
        method: "POST",
        body: {
          title: isDues && recurring ? undefined : title,
          type,
          amountKobo: kobo,
          dueDate,
          audience,
          memberIds: audience === "SELECTED" ? picked : [],
          recurring: isDues && recurring,
        },
      });
      toast.show(`${c.title} started ✓`);
      router.replace(`/money/collections/${c.id}`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back="/money" />
      <main className="page">
        <h1 className="h1">New collection</h1>

        <section className="stack">
          <span className="label">What for?</span>
          <div className="chips">
            {TYPES.map((t) => (
              <button
                key={t.value}
                className={`chip ${type === t.value ? "chip-on" : ""}`}
                onClick={() => {
                  setType(t.value);
                  if (t.amount) setAmount((t.amount / 100).toLocaleString("en-NG"));
                  if (t.value === "CDC" && !title) setTitle(`CDC ${new Date().getFullYear()}`);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {isDues && (
          <button className={`chip ${recurring ? "chip-on" : ""}`} style={{ alignSelf: "flex-start" }} aria-pressed={recurring} onClick={() => setRecurring(!recurring)}>
            {recurring ? "✓ " : ""}Repeat every month
          </button>
        )}
        {isDues && recurring ? (
          <p className="muted small" style={{ margin: 0 }}>A new month&apos;s dues start by themselves on the 1st.</p>
        ) : (
          <Field label="Name">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Abuja Cup entry" />
          </Field>
        )}

        <section className="stack">
          <span className="label">Amount each</span>
          <AmountInput value={amount} onChange={setAmount} />
        </section>

        <Field label="Due by">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        <section className="stack">
          <span className="label">Who pays?</span>
          <div className="chips">
            {([["ACTIVE", "Active members"], ["ACTIVE_AND_TRIALISTS", "Active + trialists"], ["SELECTED", "Pick members"]] as [Audience, string][]).map(([a, label]) => (
              <button key={a} className={`chip ${audience === a ? "chip-on" : ""}`} onClick={() => setAudience(a)}>{label}</button>
            ))}
          </div>
          {audience === "SELECTED" && (
            <div className="list">
              {members.map((m) => {
                const on = picked.includes(m.id);
                return (
                  <button
                    key={m.id}
                    className="list-row"
                    style={{ width: "100%", border: "none", background: on ? "rgba(42,140,153,0.08)" : "transparent", textAlign: "left", cursor: "pointer" }}
                    onClick={() => setPicked(on ? picked.filter((x) => x !== m.id) : [...picked, m.id])}
                    aria-pressed={on}
                  >
                    <JerseyBadge n={m.jerseyNumber} />
                    <span className="grow">{m.fullName}</span>
                    <span style={{ fontSize: 20, color: on ? "var(--teal)" : "var(--line)" }}>{on ? "✓" : "○"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="sticky-action">
          <button className="btn btn-primary btn-block" disabled={!ready || busy} onClick={save}>
            {busy ? "Starting…" : `Start · ${count} × ${naira(kobo)} = ${naira(kobo * count)}`}
          </button>
        </div>
      </main>
    </>
  );
}
