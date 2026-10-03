"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, REASON_LABEL, type MatchView, type OutReason, type SquadRow } from "@/lib/api";
import { Sheet } from "@/components/money";
import { useToast } from "@/components/Toast";
import { JerseyBadge } from "@/components/ui";

/** Who's in. Tap to flip someone; out asks why. */
export function SquadTab({ match, onChange }: { match: MatchView; onChange: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<SquadRow[] | null>(null);
  const [outFor, setOutFor] = useState<SquadRow | null>(null);
  const open = match.status === "SCHEDULED";

  useEffect(() => {
    api<SquadRow[]>(`/matches/${match.id}/squad`).then(setRows);
  }, [match.id]);

  async function set(r: SquadRow, status: "IN" | "OUT", reason?: OutReason) {
    try {
      setRows(await api<SquadRow[]>(`/matches/${match.id}/availability/${r.memberId}`, { method: "PUT", body: { status, reason } }));
      toast.show(`${r.nickname ?? r.fullName.split(" ")[0]}: ${status === "IN" ? "in" : "out"} ✓`);
      onChange();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  if (!rows) return <div className="empty"><span className="spinner" /></div>;
  const ins = rows.filter((r) => r.availability === "IN").length;

  return (
    <>
      <span className="small"><strong className="money-in">{ins} in</strong> · {rows.length - ins} out{open ? " · tap to change" : ""}</span>
      <div className="list">
        {rows.map((r) => (
          <div key={r.memberId} className="list-row" style={{ cursor: open ? "pointer" : "default" }}
            onClick={() => open && (r.availability === "IN" ? setOutFor(r) : set(r, "IN"))}>
            <JerseyBadge n={r.jerseyNumber} />
            <span className="grow">{r.fullName}</span>
            <span className="mono small muted" style={{ width: 36 }}>{r.position ?? ""}</span>
            {r.availability === "IN" ? (
              <span className="mark-label mark-label-PRESENT">In</span>
            ) : (
              <span className="mark-label mark-label-ABSENT">Out{r.reason ? ` · ${REASON_LABEL[r.reason]}` : ""}</span>
            )}
          </div>
        ))}
      </div>
      {outFor && (
        <Sheet onClose={() => setOutFor(null)}>
          <strong>{outFor.fullName} is out because…</strong>
          <div className="chips">
            {(Object.keys(REASON_LABEL) as OutReason[]).map((reason) => (
              <button key={reason} className="chip" onClick={() => { set(outFor, "OUT", reason); setOutFor(null); }}>{REASON_LABEL[reason]}</button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
