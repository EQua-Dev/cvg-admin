"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage, type Session, type SessionKind } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Field, TopBar } from "@/components/ui";
import { TrainingGate } from "../shared";

export default function NewSessionPage() {
  return (
    <TrainingGate>
      <NewSession />
    </TrainingGate>
  );
}

function NewSession() {
  const router = useRouter();
  const toast = useToast();
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("17:30");
  const [venue, setVenue] = useState("Area 1 Field");
  const [focus, setFocus] = useState("");
  const [kind, setKind] = useState<SessionKind>("OPTIONAL");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const s = await api<Session>("/training/sessions", { method: "POST", body: { date, startTime: time, venue, kind, focus: focus || null } });
      toast.show("Session added ✓");
      router.replace(`/training/${s.id}`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back="/training" />
      <main className="page">
        <h1 className="h1">Impromptu session</h1>
        <div className="row">
          <div className="grow"><Field label="Day"><input className="input" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
          <div style={{ width: 130 }}><Field label="Time"><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field></div>
        </div>
        <Field label="Where"><input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
        <Field label="Focus · optional"><input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Fitness" /></Field>
        <div className="segmented">
          <button className={kind === "OPTIONAL" ? "on" : ""} onClick={() => setKind("OPTIONAL")}>Optional</button>
          <button className={kind === "COMPULSORY" ? "on" : ""} onClick={() => setKind("COMPULSORY")}>Compulsory</button>
        </div>
        <div className="sticky-action">
          <button className="btn btn-primary btn-block" disabled={busy || !venue.trim()} onClick={save}>Add session</button>
        </div>
      </main>
    </>
  );
}
