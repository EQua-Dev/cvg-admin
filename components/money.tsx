"use client";

import { useEffect, useRef, useState } from "react";
import { METHOD_LABEL, type Method } from "@/lib/api";
import { naira, toKobo } from "@/lib/format";

/** Big ₦ input with quick-amount chips. Value is the typed text; use toKobo() to read it. */
export function AmountInput({
  value,
  onChange,
  quick = [100000, 200000, 500000, 1000000],
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  quick?: number[];
  autoFocus?: boolean;
}) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="amount-input">
        <span>₦</span>
        <input
          inputMode="decimal"
          placeholder="0"
          value={value}
          autoFocus={autoFocus}
          aria-label="Amount in naira"
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, "");
            onChange(digits ? Number(digits).toLocaleString("en-NG") : "");
          }}
        />
      </label>
      {quick.length > 0 && (
        <div className="chips">
          {quick.map((k) => (
            <button key={k} type="button" className={`chip ${toKobo(value) === k ? "chip-on" : ""}`} onClick={() => onChange((k / 100).toLocaleString("en-NG"))}>
              {naira(k)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MethodPicker({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="How they paid">
      {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={value === m} className={value === m ? "on" : ""} onClick={() => onChange(m)}>
          {METHOD_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet; closes on backdrop tap or Escape. */
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" ref={ref} role="dialog" aria-modal="true">
        <span className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}

/** "Take a photo" button that hands back the chosen image file. */
export function PhotoButton({ label, onFile, busy }: { label: string; onFile: (f: File) => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) {
            setName(f.name);
            onFile(f);
          }
        }}
      />
      <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => input.current?.click()} style={{ borderStyle: "dashed" }}>
        {name ? "✓ Photo attached" : label}
      </button>
    </>
  );
}
