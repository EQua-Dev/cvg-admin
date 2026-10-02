import { SessionProvider } from "@/components/Session";
import { BottomNav } from "@/components/ui";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <BottomNav />
    </SessionProvider>
  );
}
