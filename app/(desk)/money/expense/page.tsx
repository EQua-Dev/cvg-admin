"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage, upload, type Category, type Entry, type Method } from "@/lib/api";
import { naira, toKobo } from "@/lib/format";
import { shrinkPhoto } from "@/lib/image";
import { AmountInput, MethodPicker, PhotoButton } from "@/components/money";
import { useToast } from "@/components/Toast";
import { Field, TopBar } from "@/components/ui";
import { MoneyGate } from "../shared";

const KINDS: { value: Category; label: string }[] = [
  { value: "FIELD_RENTAL", label: "Field rental" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MATCH_FEE", label: "Match / referee" },
  { value: "TOURNAMENT_FEE", label: "Tournament fee" },
  { value: "KIT", label: "Kit" },
  { value: "WELFARE", label: "Welfare" },
  { value: "OTHER", label: "Other" },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExpensePage() {
  return (
    <MoneyGate>
      <Expense />
    </MoneyGate>
  );
}

function Expense() {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const kobo = toKobo(amount);

  async function record() {
    setBusy(true);
    try {
      const entry = await api<Entry>("/ledger/expenses", {
        method: "POST",
        body: { category, amountKobo: kobo, method, note, occurredOn: date },
      });
      if (receipt) {
        const blob = await shrinkPhoto(receipt).catch(() => receipt);
        await upload(`/ledger/${entry.id}/receipt`, blob).catch(() => toast.show("Saved, but the receipt didn't upload.", "alert"));
      }
      toast.show(`−${naira(kobo)} recorded ✓`);
      router.replace("/money/ledger");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back="/money" />
      <main className="page">
        <h1 className="h1">Money out</h1>

        <section className="stack">
          <span className="label">What for?</span>
          <div className="chips">
            {KINDS.map((k) => (
              <button key={k.value} className={`chip ${category === k.value ? "chip-on" : ""}`} onClick={() => setCategory(k.value)}>{k.label}</button>
            ))}
          </div>
        </section>

        <section className="stack">
          <span className="label">Amount</span>
          <AmountInput value={amount} onChange={setAmount} quick={[400000, 1200000, 1800000]} />
        </section>

        <Field label="Details">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Match balls ×2" maxLength={200} />
        </Field>

        <MethodPicker value={method} onChange={setMethod} />

        <Field label="Date">
          <input className="input" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <PhotoButton label="📷 Photo of the receipt" onFile={setReceipt} busy={busy} />
        {!receipt && <span className="muted small">No receipt? It shows with a ⚠ until one is added.</span>}

        <div className="sticky-action">
          <button className="btn btn-primary btn-block" disabled={!category || kobo <= 0 || !note.trim() || busy} onClick={record}>
            {busy ? "Recording…" : kobo > 0 ? `Record −${naira(kobo)}` : "Record"}
          </button>
        </div>
      </main>
    </>
  );
}
