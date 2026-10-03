"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, type Pattern, type SessionKind } from "@/lib/api";
import { clock, WEEKDAYS } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { Field, TopBar } from "@/components/ui";
import { TrainingGate } from "../shared";

export default function SchedulePage() {
  return (
    <TrainingGate>
      <Schedule />
    </TrainingGate>
  );
}

function Schedule() {
  const toast = useToast();
  const [patterns, setPatterns] = useState<Pattern[] | null>(null);
  const [weekday, setWeekday] = useState(3);
  const [time, setTime] = useState("17:30");
  const [venue, setVenue] = useState("Area 1 Field");
  const [kind, setKind] = useState<SessionKind>("COMPULSORY");
  const [busy, setBusy] = useState(false);

  const load = () => api<Pattern[]>("/training/patterns").then(setPatterns);
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setBusy(true);
    try {
      await api("/training/patterns", { method: "POST", body: { weekday, startTime: time, venue, kind } });
      toast.show(`${WEEKDAYS[weekday - 1]} ${clock(time)} added ✓`);
      await load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Pattern) {
    if (!confirm(`Stop ${WEEKDAYS[p.weekday - 1]} ${clock(p.startTime)} training? Future sessions are removed.`)) return;
    try {
      await api(`/training/patterns/${p.id}`, { method: "DELETE" });
      toast.show("Removed ✓");
      await load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  return (
    <>
      <TopBar back="/training" />
      <main className="page">
        <h1 className="h1">Weekly schedule</h1>

        {patterns && patterns.length > 0 && (
          <div className="list">
            {patterns.map((p) => (
              <div key={p.id} className="list-row">
                <span className="mono" style={{ fontWeight: 600, width: 96 }}>{WEEKDAYS[p.weekday - 1]} {clock(p.startTime)}</span>
                <span className="grow">
                  <span style={{ display: "block" }}>{p.venue}</span>
                  <span className={`kind kind-${p.kind}`}>{p.kind === "COMPULSORY" ? "Compulsory" : "Optional"}</span>
                </span>
                <button className="btn btn-quiet btn-sm" onClick={() => remove(p)} aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="card stack" style={{ gap: 14 }}>
          <span className="label">Add a training day</span>
          <div className="chips">
            {WEEKDAYS.map((d, i) => (
              <button key={d} className={`chip ${weekday === i + 1 ? "chip-on" : ""}`} onClick={() => setWeekday(i + 1)}>{d}</button>
            ))}
          </div>
          <div className="row">
            <div style={{ width: 130 }}>
              <Field label="Time">
                <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <div className="grow">
              <Field label="Where">
                <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="segmented">
            <button className={kind === "COMPULSORY" ? "on" : ""} onClick={() => setKind("COMPULSORY")}>Compulsory</button>
            <button className={kind === "OPTIONAL" ? "on" : ""} onClick={() => setKind("OPTIONAL")}>Optional</button>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy || !venue.trim() || !time} onClick={add}>
            Add {WEEKDAYS[weekday - 1]} {time && clock(time)}
          </button>
          <span className="muted small">Sessions for the next 2 weeks appear by themselves.</span>
        </div>
      </main>
    </>
  );
}
