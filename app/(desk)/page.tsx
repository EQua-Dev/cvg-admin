"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type LedgerMonth, type Member, type Season } from "@/lib/api";
import { firstName, greeting, naira } from "@/lib/format";
import { useSession } from "@/components/Session";
import { TopBar } from "@/components/ui";

export default function HomePage() {
  const { me, isAdmin } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [money, setMoney] = useState<LedgerMonth | null>(null);
  const handlesMoney = me.member.roles.some((r) => r === "ADMIN" || r === "TREASURER");

  useEffect(() => {
    api<Member[]>("/members").then(setMembers).catch(() => setMembers([]));
    api<Season>("/seasons/current")
      .then(setSeason)
      .catch((e) => setSeason(e instanceof ApiError && e.status === 404 ? null : undefined));
    if (handlesMoney) api<LedgerMonth>("/ledger").then(setMoney).catch(() => {});
  }, [handlesMoney]);

  const active = members?.filter((m) => m.status === "ACTIVE").length ?? 0;
  const trialists = members?.filter((m) => m.status === "TRIALIST").length ?? 0;

  return (
    <>
      <TopBar />
      <main className="page">
        <h1 className="h2" style={{ fontSize: 26, marginTop: 8 }}>
          {greeting()}, {firstName(me.member)}.
        </h1>

        {me.usesDefaultPasscode && (
          <Link href="/passcode" className="card card-accent card-link">
            <span>
              <strong>Set your own passcode</strong>
              <br />
              <span className="muted small">You still use the last 4 digits of your phone.</span>
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}

        <Link href="/members" className="card card-link">
          <span className="stack" style={{ gap: 6 }}>
            <span className="label">Squad</span>
            <span className="row" style={{ gap: 20 }}>
              <span>
                <span className="stat">{members ? active : "–"}</span> <span className="muted small">active</span>
              </span>
              <span>
                <span className="stat">{members ? trialists : "–"}</span> <span className="muted small">trialists</span>
              </span>
            </span>
          </span>
          <span aria-hidden>→</span>
        </Link>

        {handlesMoney && (
          <Link href="/money" className="card card-link">
            <span className="stack" style={{ gap: 6 }}>
              <span className="label">Club balance</span>
              <span className="stat">{money ? naira(money.balanceKobo) : "–"}</span>
              {money && money.flaggedCount > 0 && <span className="small" style={{ color: "var(--caution)" }}>⚠ {money.flaggedCount} without receipt</span>}
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}

        <Link href="/seasons" className="card card-link">
          <span className="stack" style={{ gap: 6 }}>
            <span className="label">Season</span>
            {season ? (
              <span className="h2">{season.name}</span>
            ) : season === null ? (
              <span className="muted">No active season{isAdmin ? ". Start one." : "."}</span>
            ) : (
              <span className="muted">–</span>
            )}
          </span>
          <span aria-hidden>→</span>
        </Link>

        {isAdmin && (
          <Link href="/members/new" className="btn btn-primary btn-block">
            + Add member
          </Link>
        )}
      </main>
    </>
  );
}
