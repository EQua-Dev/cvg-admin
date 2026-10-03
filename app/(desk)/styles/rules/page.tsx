"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, PLAN_NAMES, type Link as ChemLink, type RoleRef, type RuleView } from "@/lib/api";
import { Sheet } from "@/components/money";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/ui";

const GROUPS = ["GK", "DEF", "MID", "ATT"] as const;
const GROUP_ANY: Record<string, string> = { GK: "Any keeper", DEF: "Any defender", MID: "Any midfielder", ATT: "Any attacker" };
const LINK_LABEL: Record<ChemLink, string> = { GREEN: "Works", AMBER: "Risky", RED: "Clash" };

export default function RulesPage() {
  const toast = useToast();
  const { me } = useSession();
  const canEdit = me.member.roles.some((r) => r === "ADMIN" || r === "COACH");
  const [rules, setRules] = useState<RuleView[] | null>(null);
  const [roles, setRoles] = useState<{ token: string; name: string; group: string }[]>([]);
  const [adding, setAdding] = useState(false);

  const load = () => api<RuleView[]>("/chemistry/rules").then(setRules);
  useEffect(() => {
    load();
    Promise.all(GROUPS.map((g) => api<RoleRef[]>(`/styles/roles/${g}`).then((l) => [
      { token: `${g}*`, name: GROUP_ANY[g], group: g }, ...l.map((r) => ({ token: r.code, name: r.name, group: g })),
    ]))).then((all) => setRoles(all.flat()));
  }, []);

  async function remove(r: RuleView) {
    if (!confirm(`Remove "${r.nameA} + ${r.nameB}"?`)) return;
    try {
      await api(`/chemistry/rules/${r.id}`, { method: "DELETE" });
      toast.show("Removed");
      load();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  return (
    <>
      <TopBar back="/styles" />
      <main className="page">
        <div className="spread">
          <h1 className="h1">Chemistry</h1>
          {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Rule</button>}
        </div>
        <span className="muted small">Lines on the lineup board come from these. Everything else is neutral.</span>
        {!rules ? <div className="empty"><span className="spinner" /></div> : (
          <div className="list">
            {rules.map((r) => (
              <div key={r.id} className="list-row" style={{ gap: 10 }}>
                <span className={`dot dot-${r.link}`} />
                <span className="grow stack" style={{ gap: 2 }}>
                  <strong className="small">{r.nameA} + {r.nameB}</strong>
                  <span className="muted small">
                    {[r.scope === "TEAM" ? "anywhere in the team" : "side by side", r.plan && `in ${PLAN_NAMES[r.plan]}`, r.unlessRole && `unless a ${roles.find((x) => x.token === r.unlessRole)?.name ?? r.unlessRole} plays`, r.note].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {canEdit && <button className="btn btn-quiet" onClick={() => remove(r)} aria-label="Remove">✕</button>}
              </div>
            ))}
          </div>
        )}
      </main>
      {adding && <AddRule roles={roles} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

function AddRule({ roles, onClose, onSaved }: { roles: { token: string; name: string; group: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [link, setLink] = useState<ChemLink>("GREEN");
  const [team, setTeam] = useState(false);
  const [plan, setPlan] = useState("");
  const [note, setNote] = useState("");

  async function save() {
    try {
      await api("/chemistry/rules", { method: "POST", body: { roleA: a, roleB: b, link, scope: team ? "TEAM" : "NEIGHBOURS", plan: plan || null, note: note || null } });
      toast.show("Rule added ✓");
      onSaved();
    } catch (e) {
      toast.show(errorMessage(e), "alert");
    }
  }

  const select = (value: string, set: (v: string) => void) => (
    <select className="input" value={value} onChange={(e) => set(e.target.value)}>
      <option value="">Pick a role…</option>
      {GROUPS.map((g) => (
        <optgroup key={g} label={g}>
          {roles.filter((r) => r.group === g).map((r) => <option key={r.token} value={r.token}>{r.name}</option>)}
        </optgroup>
      ))}
    </select>
  );

  return (
    <Sheet onClose={onClose}>
      <strong>New rule</strong>
      {select(a, setA)}
      {select(b, setB)}
      <div className="segmented">
        {(["GREEN", "AMBER", "RED"] as ChemLink[]).map((l) => <button key={l} className={link === l ? "on" : ""} onClick={() => setLink(l)}><span className={`dot dot-${l}`} /> {LINK_LABEL[l]}</button>)}
      </div>
      <div className="chips">
        <button className={`chip ${!team ? "chip-on" : ""}`} onClick={() => setTeam(false)}>Side by side</button>
        <button className={`chip ${team ? "chip-on" : ""}`} onClick={() => setTeam(true)}>Anywhere in the team</button>
      </div>
      <div className="chips">
        <button className={`chip ${plan === "" ? "chip-on" : ""}`} onClick={() => setPlan("")}>Any plan</button>
        {Object.entries(PLAN_NAMES).map(([code, name]) => <button key={code} className={`chip ${plan === code ? "chip-on" : ""}`} onClick={() => setPlan(code)}>{name}</button>)}
      </div>
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (optional)" maxLength={120} />
      <button className="btn btn-primary btn-block" disabled={!a || !b} onClick={save}>Add rule</button>
    </Sheet>
  );
}
