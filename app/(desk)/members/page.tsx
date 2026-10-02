"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, STATUSES, type Member, type MemberStatus } from "@/lib/api";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/format";
import { useSession } from "@/components/Session";
import { JerseyBadge, TopBar } from "@/components/ui";

type Filter = "ALL" | MemberStatus;

export default function MembersPage() {
  const { isAdmin } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    api<Member[]>("/members").then(setMembers);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => (filter === "ALL" ? m.status !== "LEFT" : m.status === filter))
      .filter(
        (m) =>
          !q ||
          m.fullName.toLowerCase().includes(q) ||
          m.nickname?.toLowerCase().includes(q) ||
          String(m.jerseyNumber ?? "") === q,
      )
      .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
  }, [members, query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    ...STATUSES.map((s) => ({ value: s as Filter, label: STATUS_LABEL[s] })),
  ];

  return (
    <>
      <TopBar title={members ? `${members.filter((m) => m.status !== "LEFT").length} members` : undefined} />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Squad</h1>
          {isAdmin && (
            <Link href="/members/new" className="btn btn-primary btn-sm">
              + Add
            </Link>
          )}
        </div>

        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            className="input"
            type="search"
            placeholder="Name or jersey"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search members"
          />
        </div>

        <div className="chips" role="tablist">
          {filters.map((f) => (
            <button
              key={f.value}
              className={`chip ${filter === f.value ? "chip-on" : ""}`}
              onClick={() => setFilter(f.value)}
              role="tab"
              aria-selected={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!members ? (
          <div className="empty"><span className="spinner" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">{members.length === 0 ? "No members yet." : "No one matches."}</div>
        ) : (
          <div className="list">
            {shown.map((m) => (
              <Link key={m.id} href={`/members/${m.id}`} className="list-row">
                <JerseyBadge n={m.jerseyNumber} />
                <span className="grow">
                  <span className="ellipsis" style={{ display: "block", fontWeight: 600 }}>
                    {m.fullName}
                    {m.nickname && <span className="muted" style={{ fontWeight: 400 }}> · {m.nickname}</span>}
                  </span>
                  {m.roles.length > 0 && (
                    <span className="muted small">{m.roles.map((r) => ROLE_LABEL[r]).join(" · ")}</span>
                  )}
                </span>
                <span className={`status status-${m.status}`}>{STATUS_LABEL[m.status]}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
