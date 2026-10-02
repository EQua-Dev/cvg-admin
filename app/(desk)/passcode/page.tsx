"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasscodeSetup } from "@/components/PasscodeSetup";
import { useSession } from "@/components/Session";
import { useToast } from "@/components/Toast";
import { TopBar } from "@/components/ui";

export default function PasscodePage() {
  const { me, refresh } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [first, setFirst] = useState(false);

  useEffect(() => {
    setFirst(new URLSearchParams(window.location.search).has("first"));
  }, []);

  return (
    <>
      {!first && <TopBar back="/me" />}
      <main className="page" style={{ paddingTop: first ? 48 : 24 }}>
        {first && (
          <p className="muted" style={{ margin: 0 }}>
            You signed in with the last 4 digits of your phone. Pick your own passcode to keep your account safe.
          </p>
        )}
        <PasscodeSetup
          phone={me.member.phone ?? ""}
          usesDefault={me.usesDefaultPasscode}
          onDone={async () => {
            await refresh();
            toast.show("Passcode saved ✓");
            router.replace("/");
          }}
          onSkip={first ? () => router.replace("/") : undefined}
        />
      </main>
    </>
  );
}
