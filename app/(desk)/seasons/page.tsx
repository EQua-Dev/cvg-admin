"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, type Season } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { Field, TopBar } from "@/components/ui";

/** Suggests the next football season: Sept → Aug. */
function suggestion() {
  const now = new Date();
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return { name: `${start}/${String(start + 1).slice(2)}`, startsOn: `${start}-09-01`, endsOn: `${start + 1}-08-31` };
}

export default function SeasonsPage() {
  const { isAdmin } = useSession();
  const toast = useToast();
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...suggestion(), activate: true });
  const [busy, setBusy] = useState(false);

  const load = () => api<Season[]>("/seasons").then(setSeasons);
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/seasons", { method: "POST", body: form });
      toast.show("Season added ✓");
      setAdding(false);
      await load();
    } catch (err) {
      toast.show(errorMessage(err), "alert");
    } finally {
      setBusy(false);
    }
  }

  async function activate(s: Season) {
    try {
      await api(`/seasons/${s.id}/activate`, { method: "POST" });
      toast.show(`${s.name} is now active ✓`);
      await load();
    } catch (err) {
      toast.show(errorMessage(err), "alert");
    }
  }

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Seasons</h1>
          {isAdmin && !adding && (
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ New</button>
          )}
        </div>

        {adding && (
          <form className="card stack" style={{ gap: 14 }} onSubmit={create}>
            <Field label="Name">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="row">
              <div className="grow">
                <Field label="Starts">
                  <input className="input" type="date" value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
                </Field>
              </div>
              <div className="grow">
                <Field label="Ends">
                  <input className="input" type="date" value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
                </Field>
              </div>
            </div>
            <button
              type="button"
              className={`chip ${form.activate ? "chip-on" : ""}`}
              style={{ alignSelf: "flex-start" }}
              aria-pressed={form.activate}
              onClick={() => setForm({ ...form, activate: !form.activate })}
            >
              {form.activate ? "✓ " : ""}Make it the active season
            </button>
            <div className="row">
              <button type="button" className="btn btn-ghost grow" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary grow" disabled={busy || !form.name.trim()}>Save</button>
            </div>
          </form>
        )}

        {!seasons ? (
          <div className="empty"><span className="spinner" /></div>
        ) : seasons.length === 0 ? (
          <div className="empty">No seasons yet.</div>
        ) : (
          <div className="list">
            {seasons.map((s) => (
              <div key={s.id} className="list-row">
                <span className="grow">
                  <span style={{ display: "block", fontWeight: 700 }}>{s.name}</span>
                  <span className="muted small">{shortDate(s.startsOn)} – {shortDate(s.endsOn)}</span>
                </span>
                {s.active ? (
                  <span className="status status-ACTIVE">● Active</span>
                ) : (
                  isAdmin && <button className="btn btn-quiet btn-sm" onClick={() => activate(s)}>Make active</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
