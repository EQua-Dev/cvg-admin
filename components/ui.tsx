"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { jersey } from "@/lib/format";
import { useSession } from "@/components/Session";

export function JerseyBadge({ n, size = "md" }: { n?: number; size?: "md" | "lg" }) {
  return <span className={`jersey jersey-${size}`}>{jersey(n)}</span>;
}

export function Chips<T extends string>({
  options,
  value,
  onToggle,
  label,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onToggle: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={`chip ${on ? "chip-on" : ""}`}
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
          >
            {on && "✓ "}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function TopBar({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="topbar">
      {back ? (
        <Link href={back} className="back">
          ← Back
        </Link>
      ) : (
        <span className="brand">
          <span className="brand-mark">◆</span> CVG
        </span>
      )}
      {title && <span className="topbar-title">{title}</span>}
    </header>
  );
}

const ICONS = {
  home: "M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5",
  squad: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.5M17 14.5a5.5 5.5 0 0 1 3.5 4.5",
  money: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v.01M18 14v.01",
  training: "M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  matches: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4L12 7.5ZM12 3v4.5M20.5 10.3l-4.7 0M17.3 19l-3-4.3M6.7 19l3-4.3M3.5 10.3l4.7 0",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0",
};

export function BottomNav() {
  const path = usePathname();
  const { me } = useSession();
  const handlesMoney = me.member.roles.some((r) => r === "ADMIN" || r === "TREASURER");
  const runsTraining = me.member.roles.some((r) => r === "ADMIN" || r === "COACH" || r === "CAPTAIN");
  const tabs = [
    { href: "/", label: "Home", icon: ICONS.home },
    { href: "/members", label: "Squad", icon: ICONS.squad },
    ...(runsTraining ? [{ href: "/training", label: "Training", icon: ICONS.training }, { href: "/matches", label: "Matches", icon: ICONS.matches }] : []),
    ...(handlesMoney ? [{ href: "/money", label: "Money", icon: ICONS.money }] : []),
    { href: "/me", label: "Me", icon: ICONS.me },
  ];
  return (
    <nav className="bottomnav">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "tab-on" : ""}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={t.icon} />
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
