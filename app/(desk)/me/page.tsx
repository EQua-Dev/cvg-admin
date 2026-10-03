"use client";

import Link from "next/link";
import { ROLE_LABEL } from "@/lib/format";
import { SignOutButton, useSession } from "@/components/Session";
import { JerseyBadge, TopBar } from "@/components/ui";

export default function MePage() {
  const { me } = useSession();
  const m = me.member;
  return (
    <>
      <TopBar />
      <main className="page">
        <div className="row" style={{ gap: 16 }}>
          <JerseyBadge n={m.jerseyNumber} size="lg" />
          <div>
            <h1 className="h2" style={{ fontSize: 24 }}>{m.fullName}</h1>
            <span className="muted">{m.roles.map((r) => ROLE_LABEL[r]).join(" · ")}</span>
          </div>
        </div>
        <div className="card">
          <div className="kv"><span className="muted">Member ID</span><span className="mono">{m.code}</span></div>
          <div className="kv"><span className="muted">Phone</span><span className="mono">{m.phone}</span></div>
          <div className="kv">
            <span className="muted">Passcode</span>
            <span>{me.usesDefaultPasscode ? "Last 4 of phone" : "Your own ✓"}</span>
          </div>
        </div>
        <Link href="/seasons" className="btn btn-ghost btn-block">Seasons</Link>
        <Link href="/passcode" className="btn btn-ghost btn-block">
          {me.usesDefaultPasscode ? "Set your passcode" : "Change passcode"}
        </Link>
        <SignOutButton />
      </main>
    </>
  );
}
