"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

type Step = "current" | "new" | "confirm";

/**
 * Set or change the passcode in short steps: one box per screen.
 * Members still on the default skip the "current" step: we already know it's
 * the last 4 digits of their phone.
 */
export function PasscodeSetup({
  phone,
  usesDefault,
  onDone,
  onSkip,
}: {
  phone: string;
  usesDefault: boolean;
  onDone: () => void;
  onSkip?: () => void;
}) {
  const defaultCode = phone.replace(/\D/g, "").slice(-4);
  const [step, setStep] = useState<Step>(usesDefault ? "new" : "current");
  const [current, setCurrent] = useState(usesDefault ? defaultCode : "");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const steps: Step[] = usesDefault ? ["new", "confirm"] : ["current", "new", "confirm"];
  const value = step === "current" ? current : step === "new" ? next : again;
  const setValue = step === "current" ? setCurrent : step === "new" ? setNext : setAgain;

  const title = {
    current: "Your current passcode",
    new: usesDefault ? "Pick your passcode" : "New passcode",
    confirm: "Type it again",
  }[step];

  async function advance(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step === "current") return setStep("new");
    if (step === "new") return setStep("confirm");
    if (again !== next) {
      setError("They don't match. Try again.");
      setAgain("");
      setNext("");
      return setStep("new");
    }
    setBusy(true);
    try {
      await api("/auth/passcode", { method: "PUT", body: { currentPasscode: current, newPasscode: next } });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setAgain("");
      setNext("");
      setStep((err as { code?: string }).code === "wrong_passcode" && !usesDefault ? "current" : "new");
      if (!usesDefault && (err as { code?: string }).code === "wrong_passcode") setCurrent("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={advance}>
      <div className="row" aria-hidden style={{ gap: 6 }}>
        {steps.map((s) => (
          <span
            key={s}
            style={{
              width: 28,
              height: 4,
              borderRadius: 2,
              background: steps.indexOf(s) <= steps.indexOf(step) ? "var(--orange)" : "var(--line)",
            }}
          />
        ))}
      </div>
      <h1 className="h1">{title}</h1>
      <input
        key={step}
        className="input input-pin"
        type="password"
        inputMode="numeric"
        autoComplete={step === "current" ? "current-password" : "new-password"}
        pattern="[0-9]*"
        maxLength={6}
        placeholder="••••"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        autoFocus
        aria-label={title}
      />
      <span className="muted small">4 to 6 numbers. No 1234 or 0000.</span>
      {error && (
        <div className="notice notice-caution" role="alert">
          {error}
        </div>
      )}
      <button className="btn btn-primary btn-block" disabled={value.length < 4 || busy}>
        {step === "confirm" ? (busy ? "Saving…" : "Save passcode") : "Next"}
      </button>
      {onSkip && (
        <button type="button" className="btn btn-quiet" onClick={onSkip}>
          Skip for now
        </button>
      )}
    </form>
  );
}
