"use client";

import Link from "next/link";
import { useSession } from "@/components/Session";
import { TopBar } from "@/components/ui";

/** Only admins and the treasurer see money screens. */
export function MoneyGate({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  const ok = me.member.roles.some((r) => r === "ADMIN" || r === "TREASURER");
  if (!ok) {
    return (
      <>
        <TopBar back="/" />
        <main className="page"><div className="empty">Money is for the treasurer and admins.</div></main>
      </>
    );
  }
  return <>{children}</>;
}

export function MoneyTabs({ active }: { active: "collections" | "ledger" }) {
  return (
    <div className="segmented">
      <Link href="/money" className={active === "collections" ? "on" : ""}>Collections</Link>
      <Link href="/money/ledger" className={active === "ledger" ? "on" : ""}>Ledger</Link>
    </div>
  );
}
