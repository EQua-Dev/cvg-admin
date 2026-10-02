"use client";

import { useState } from "react";
import { ApiError, ROLES, type MemberStatus, type Role } from "@/lib/api";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/format";
import { Chips, Field } from "@/components/ui";

export interface MemberFormValues {
  fullName: string;
  nickname: string;
  phone: string;
  jerseyNumber: string;
  status: MemberStatus;
  roles: Role[];
}

/** Shared by "Add member" and "Edit". Status and roles only show when adding. */
export function MemberForm({
  initial,
  mode,
  submitLabel,
  onSubmit,
}: {
  initial: MemberFormValues;
  mode: "add" | "edit";
  submitLabel: string;
  onSubmit: (values: MemberFormValues) => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof MemberFormValues>(k: K, value: MemberFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setErrors(err.fields);
        else if (err.code === "jersey_taken") setErrors({ jerseyNumber: err.message });
        else if (err.code === "phone_taken" || err.code === "invalid_phone") setErrors({ phone: err.message });
        else setFormError(err.message);
      } else {
        setFormError("Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
      <Field label="Full name" error={errors.fullName}>
        <input className="input" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Sola Adeniyi" autoComplete="off" />
      </Field>

      <Field label="Phone" error={errors.phone}>
        <input className="input input-mono" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0803 555 0000" autoComplete="off" />
      </Field>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <Field label="Nickname" error={errors.nickname}>
            <input className="input" value={v.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="Optional" autoComplete="off" />
          </Field>
        </div>
        <div style={{ width: 104 }}>
          <Field label="Jersey" error={errors.jerseyNumber}>
            <input
              className="input input-mono"
              inputMode="numeric"
              value={v.jerseyNumber}
              onChange={(e) => set("jerseyNumber", e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="–"
              style={{ textAlign: "center", fontSize: 18 }}
            />
          </Field>
        </div>
      </div>

      {mode === "add" && (
        <>
          <div className="field">
            <span className="label">Status</span>
            <Chips
              label="Status"
              options={(["TRIALIST", "ACTIVE"] as MemberStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              value={[v.status]}
              onToggle={(s) => set("status", s)}
            />
          </div>
          <div className="field">
            <span className="label">Management roles · optional</span>
            <Chips
              label="Roles"
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              value={v.roles}
              onToggle={(r) => set("roles", v.roles.includes(r) ? v.roles.filter((x) => x !== r) : [...v.roles, r])}
            />
          </div>
        </>
      )}

      {formError && <div className="notice notice-caution" role="alert">{formError}</div>}

      <div className="sticky-action">
        <button className="btn btn-primary btn-block" disabled={busy || !v.fullName.trim() || !v.phone.trim()}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
