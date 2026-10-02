import type { Member, MemberStatus, Role } from "./api";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  COACH: "Coach",
  TREASURER: "Treasurer",
  CAPTAIN: "Captain",
};

export const STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  TRIALIST: "Trialist",
  INACTIVE: "Inactive",
  LEFT: "Left",
};

export function firstName(m: Pick<Member, "fullName" | "nickname">): string {
  return m.nickname || m.fullName.split(" ")[0];
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

export function jersey(n?: number): string {
  return n == null ? "–" : String(n).padStart(2, "0");
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "0803 555 0192" → "2348035550192" for wa.me links. */
export function waNumber(displayPhone?: string): string | null {
  if (!displayPhone) return null;
  const digits = displayPhone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return "234" + digits.slice(1);
  if (digits.length === 13 && digits.startsWith("234")) return digits;
  return null;
}

/** Opens WhatsApp with a ready message, straight to that member's chat when we have their number. */
export function whatsappLink(message: string, displayPhone?: string): string {
  const n = waNumber(displayPhone);
  return `https://wa.me/${n ?? ""}?text=${encodeURIComponent(message)}`;
}

const CLUB_URL = process.env.NEXT_PUBLIC_CLUB_URL ?? "https://club.cvgfc.ng";

export function welcomeMessage(m: Member): string {
  return [
    `Welcome to CVG FC, ${firstName(m)}! ⚽`,
    ``,
    `Open the club app: ${CLUB_URL}`,
    `Phone: ${m.phone}`,
    `Passcode: last 4 digits of your phone`,
    ``,
    `Your member ID: ${m.code}`,
  ].join("\n");
}

export function resetMessage(m: Member): string {
  return [
    `Hi ${firstName(m)}, your CVG FC passcode has been reset.`,
    ``,
    `Sign in at ${CLUB_URL} with your phone and the last 4 digits of your phone, then set a new passcode.`,
  ].join("\n");
}
