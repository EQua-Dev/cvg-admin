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

/** Sent with the member's private join link: they pick a passcode and fill their profile. */
export function welcomeMessage(m: Member, joinUrl: string): string {
  return [
    `Welcome to CVG FC, ${firstName(m)}! ⚽`,
    ``,
    `Tap to set up your account (2 mins):`,
    joinUrl,
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

/** 200000 kobo → "₦2,000". */
export function naira(kobo: number): string {
  const n = Math.abs(kobo) / 100;
  const s = n.toLocaleString("en-NG", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${kobo < 0 ? "−" : ""}₦${s}`;
}

/** "2,000" typed by a human → 200000 kobo. Returns 0 for nonsense. */
export function toKobo(text: string): number {
  const n = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function dayMonth(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Reminder for one member, straight to their WhatsApp. */
export function dueReminder(name: string, title: string, owedKobo: number, dueDate: string): string {
  return `Hi ${name}, a quick reminder: ${title} — ${naira(owedKobo)} still to pay (due ${dayMonth(dueDate)}). Thanks! ⚽`;
}

/** One message for the squad group listing who still owes. */
export function groupReminder(title: string, amountKobo: number, dueDate: string, names: string[]): string {
  return [
    `${title} — ${naira(amountKobo)}, due ${dayMonth(dueDate)}`,
    ``,
    `Still to pay:`,
    ...names.map((n) => `• ${n}`),
    ``,
    `Please pay the treasurer. Thank you 🙏`,
  ].join("\n");
}
