"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, type Me } from "@/lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<Me & { token: string }>("/auth/sign-in", { method: "POST", body: { phone, passcode } });
      if (res.member.roles.length === 0) {
        await api("/auth/sign-out", { method: "POST" }).catch(() => {});
        setError("This app is for club management. Use the Club app.");
        return;
      }
      router.replace(res.usesDefaultPasscode ? "/passcode?first=1" : "/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const ready = phone.replace(/\D/g, "").length >= 10 && passcode.length >= 4;

  return (
    <main className="page" style={{ justifyContent: "center", paddingBottom: 32 }}>
      <div className="stack" style={{ gap: 6, marginBottom: 24 }}>
        <span className="brand" style={{ fontSize: 20 }}>
          <span className="brand-mark">◆</span> CVG
        </span>
        <span className="label">The Desk</span>
      </div>

      <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
        <h1 className="h1">Sign in</h1>

        <label className="field">
          <span className="label">Phone</span>
          <input
            className="input input-mono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 555 0192"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="label">Passcode</span>
          <input
            className="input input-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
          />
          <span className="muted small">First time? Use the last 4 digits of your phone.</span>
        </label>

        {error && (
          <div className="notice notice-caution" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-primary btn-block" disabled={!ready || busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted small" style={{ textAlign: "center" }}>
          Forgot your passcode? Ask an admin to reset it.
        </p>
      </form>
    </main>
  );
}
