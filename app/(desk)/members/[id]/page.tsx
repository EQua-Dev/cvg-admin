"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, ROLES, STATUSES, type Member, type MemberStatus, type Role } from "@/lib/api";
import { resetMessage, ROLE_LABEL, shortDate, STATUS_LABEL, welcomeMessage, whatsappLink } from "@/lib/format";
import { MemberForm } from "@/components/MemberForm";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { Chips, JerseyBadge, TopBar } from "@/components/ui";

export default function MemberPage() {
  const { id } = useParams<{ id: string }>();
  const { me, isAdmin } = useSession();
  const toast = useToast();
  const [m, setM] = useState<Member | null>(null);
  const [editing, setEditing] = useState(false);
  const [share, setShare] = useState<"welcome" | "reset" | null>(null);

  const load = useCallback(() => api<Member>(`/members/${id}`).then(setM), [id]);

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).has("welcome")) setShare("welcome");
  }, [load]);

  if (!m) {
    return (
      <>
        <TopBar back="/members" />
        <div className="empty"><span className="spinner" /></div>
      </>
    );
  }

  async function changeStatus(status: MemberStatus) {
    if (!m || status === m.status) return;
    if (status === "LEFT" && !confirm(`Mark ${m.fullName} as left? They will lose access. Their history stays.`)) return;
    try {
      setM(await api<Member>(`/members/${m.id}/status`, { method: "PUT", body: { status } }));
      toast.show(`${STATUS_LABEL[status]} ✓`);
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function toggleRole(role: Role) {
    if (!m) return;
    const roles = m.roles.includes(role) ? m.roles.filter((r) => r !== role) : [...m.roles, role];
    try {
      setM(await api<Member>(`/members/${m.id}/roles`, { method: "PUT", body: { roles } }));
      toast.show("Saved ✓");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  async function resetPasscode() {
    if (!m) return;
    if (!confirm(`Reset ${m.fullName}'s passcode? It goes back to the last 4 digits of their phone.`)) return;
    try {
      await api(`/members/${m.id}/reset-passcode`, { method: "POST" });
      toast.show("Passcode reset ✓");
      setShare("reset");
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (editing) {
    return (
      <>
        <TopBar title="Edit" />
        <main className="page">
          <MemberForm
            mode="edit"
            submitLabel="Save"
            initial={{
              fullName: m.fullName,
              nickname: m.nickname ?? "",
              phone: m.phone ?? "",
              jerseyNumber: m.jerseyNumber?.toString() ?? "",
              status: m.status,
              roles: m.roles,
            }}
            onSubmit={async (v) => {
              setM(
                await api<Member>(`/members/${m.id}`, {
                  method: "PUT",
                  body: {
                    fullName: v.fullName,
                    nickname: v.nickname || null,
                    phone: v.phone,
                    jerseyNumber: v.jerseyNumber ? Number(v.jerseyNumber) : null,
                    joinedOn: m.joinedOn,
                  },
                }),
              );
              setEditing(false);
              toast.show("Saved ✓");
            }}
          />
          <button className="btn btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar back="/members" title={m.code} />
      <main className="page">
        <div className="row" style={{ gap: 16 }}>
          <JerseyBadge n={m.jerseyNumber} size="lg" />
          <div className="grow">
            <h1 className="h2" style={{ fontSize: 24 }}>{m.fullName}</h1>
            <span className={`status status-${m.status}`}>{STATUS_LABEL[m.status]}</span>
            {m.nickname && <span className="muted small"> · “{m.nickname}”</span>}
          </div>
        </div>

        {share && m.phone && (
          <div className="card stack" style={{ borderColor: "var(--good)" }}>
            <span>
              {share === "welcome" ? "Send them their sign-in details." : "Let them know their passcode was reset."}
            </span>
            <a
              className="btn btn-wa btn-block"
              href={whatsappLink(share === "welcome" ? welcomeMessage(m) : resetMessage(m), m.phone)}
              target="_blank"
              rel="noreferrer"
            >
              Send on WhatsApp
            </a>
          </div>
        )}

        <div className="card">
          <div className="kv"><span className="muted">Phone</span><span className="mono">{m.phone ?? "–"}</span></div>
          <div className="kv"><span className="muted">Member ID</span><span className="mono">{m.code}</span></div>
          <div className="kv"><span className="muted">Joined</span><span>{shortDate(m.joinedOn)}</span></div>
          {!isAdmin && (
            <div className="kv">
              <span className="muted">Roles</span>
              <span>{m.roles.length ? m.roles.map((r) => ROLE_LABEL[r]).join(", ") : "Player"}</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <>
            <section className="stack">
              <span className="label">Status</span>
              <Chips
                label="Status"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                value={[m.status]}
                onToggle={changeStatus}
              />
            </section>

            <section className="stack">
              <span className="label">Management roles</span>
              <Chips
                label="Roles"
                options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                value={m.roles}
                onToggle={toggleRole}
              />
              {m.id === me.member.id && <span className="muted small">You can&apos;t remove the last admin.</span>}
            </section>

            <div className="stack" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-block" onClick={() => setEditing(true)}>Edit details</button>
              {m.phone && !share && (
                <a className="btn btn-ghost btn-block" href={whatsappLink(welcomeMessage(m), m.phone)} target="_blank" rel="noreferrer">
                  Resend sign-in details
                </a>
              )}
              <button className="btn btn-danger btn-block" onClick={resetPasscode}>Reset passcode</button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
