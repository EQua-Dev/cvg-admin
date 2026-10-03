"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type CollectionSummary, type LedgerMonth } from "@/lib/api";
import { dayMonth, naira } from "@/lib/format";
import { TopBar } from "@/components/ui";
import { MoneyGate, MoneyTabs } from "./shared";

export default function MoneyPage() {
  return (
    <MoneyGate>
      <MoneyHome />
    </MoneyGate>
  );
}

function MoneyHome() {
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null);
  const [month, setMonth] = useState<LedgerMonth | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    api<CollectionSummary[]>("/collections").then(setCollections);
    api<LedgerMonth>("/ledger").then(setMonth);
  }, []);

  const shown = (collections ?? []).filter((c) => showClosed || c.open);

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="card stack" style={{ gap: 10 }}>
          <span className="label">Club balance</span>
          <span className={`big-number ${month && month.balanceKobo < 0 ? "money-out" : ""}`}>{month ? naira(month.balanceKobo) : "–"}</span>
          {month && (
            <span className="small muted">
              This month: <span className="money-in">+{naira(month.inKobo)}</span> · <span className="money-out">−{naira(month.outKobo)}</span>
            </span>
          )}
          {month && month.flaggedCount > 0 && (
            <Link href="/money/ledger" className="notice notice-caution small">
              ⚠ {month.flaggedCount} expense{month.flaggedCount > 1 ? "s" : ""} without a receipt
            </Link>
          )}
        </div>

        <div className="row">
          <Link href="/money/pay" className="btn btn-primary grow">+ Money in</Link>
          <Link href="/money/expense" className="btn btn-ghost grow">− Money out</Link>
        </div>

        <MoneyTabs active="collections" />

        <div className="spread">
          <span className="label">{showClosed ? "All collections" : "Open collections"}</span>
          <Link href="/money/collections/new" className="btn btn-quiet btn-sm">+ New</Link>
        </div>

        {!collections ? (
          <div className="empty"><span className="spinner" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">
            No collections yet.
            <br />
            <Link href="/money/collections/new" className="btn btn-primary" style={{ marginTop: 12 }}>Start monthly dues</Link>
          </div>
        ) : (
          shown.map((c) => {
            const pct = c.expectedKobo ? Math.min(100, Math.round((c.collectedKobo / c.expectedKobo) * 100)) : 0;
            return (
              <Link key={c.id} href={`/money/collections/${c.id}`} className="card stack" style={{ gap: 10, opacity: c.open ? 1 : 0.6 }}>
                <div className="spread">
                  <strong>{c.title}</strong>
                  {c.overdue ? <span className="pill pill-overdue">Overdue</span> : !c.open ? <span className="pill">Closed</span> : null}
                </div>
                <span className="muted small">
                  {naira(c.amountKobo)} each · due {dayMonth(c.dueDate)}{c.recurring ? " · monthly" : ""}
                </span>
                <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>
                <div className="spread small">
                  <span><strong>{c.paidCount}</strong>/{c.memberCount} paid{c.partialCount ? ` · ${c.partialCount} part` : ""}</span>
                  <span className="mono">{naira(c.collectedKobo)} / {naira(c.expectedKobo)}</span>
                </div>
              </Link>
            );
          })
        )}
        {collections && collections.some((c) => !c.open) && (
          <button className="btn btn-quiet" onClick={() => setShowClosed(!showClosed)}>
            {showClosed ? "Hide closed" : "Show closed"}
          </button>
        )}
      </main>
    </>
  );
}
