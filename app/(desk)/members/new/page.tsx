"use client";

import { useRouter } from "next/navigation";
import { api, type Member } from "@/lib/api";
import { MemberForm } from "@/components/MemberForm";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/ui";

export default function NewMemberPage() {
  const { isAdmin } = useSession();
  const router = useRouter();
  const toast = useToast();

  if (!isAdmin) {
    return (
      <>
        <TopBar back="/members" />
        <main className="page"><div className="empty">Only admins can add members.</div></main>
      </>
    );
  }

  return (
    <>
      <TopBar back="/members" />
      <main className="page">
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="h1">Add member</h1>
          <span className="muted small">They sign in with their phone. First passcode: last 4 digits of it.</span>
        </div>
        <MemberForm
          mode="add"
          submitLabel="Add to the squad"
          initial={{ fullName: "", nickname: "", phone: "", jerseyNumber: "", status: "TRIALIST", roles: [] }}
          onSubmit={async (v) => {
            const m = await api<Member>("/members", {
              method: "POST",
              body: {
                fullName: v.fullName,
                nickname: v.nickname || null,
                phone: v.phone,
                jerseyNumber: v.jerseyNumber ? Number(v.jerseyNumber) : null,
                status: v.status,
                roles: v.roles,
              },
            });
            toast.show(`${m.fullName} added ✓`);
            router.replace(`/members/${m.id}?welcome=1`);
          }}
        />
      </main>
    </>
  );
}
