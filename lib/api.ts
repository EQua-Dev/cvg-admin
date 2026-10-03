// Thin client for cvg-backend. All calls go to /api/* on this origin (proxied, see next.config.ts).

export type Role = "ADMIN" | "COACH" | "TREASURER" | "CAPTAIN";
export type MemberStatus = "TRIALIST" | "ACTIVE" | "INACTIVE" | "LEFT";

export const ROLES: Role[] = ["ADMIN", "COACH", "TREASURER", "CAPTAIN"];
export const STATUSES: MemberStatus[] = ["ACTIVE", "TRIALIST", "INACTIVE", "LEFT"];

export interface Member {
  id: string;
  code: string;
  fullName: string;
  nickname?: string;
  jerseyNumber?: number;
  status: MemberStatus;
  joinedOn: string;
  roles: Role[];
  phone?: string;
}

export interface Me {
  member: Member;
  usesDefaultPasscode: boolean;
}

export interface Season {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const CLIENT = "cvg-admin";

export async function api<T = void>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        "X-CVG-Client": CLIENT,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "offline", "No connection. Try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/sign-in" && typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
    throw new ApiError(
      res.status,
      data?.code ?? "error",
      data?.message ?? "Something went wrong.",
      data?.fields,
    );
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong.";
}

// ---------- M2 ----------

export interface Profile {
  memberId: string;
  photoUrl?: string;
  favouredPosition?: string;
  positionGroup?: string;
  otherPositions: string[];
  dominantFoot?: "RIGHT" | "LEFT" | "BOTH";
  weakFoot?: number;
  strengths: string[];
  weaknesses: string[];
  heightCm?: number;
  age?: number;
  stateOfOrigin?: string;
  emergencyContact?: { name: string; phone: string };
  consentPublic?: boolean;
  complete: boolean;
  missing: string[];
}

export interface ProfilingResult {
  planFits: Record<string, number>;
  topPlan: string;
  mainRole?: { code: string; name: string };
  secondaryRole?: { code: string; name: string };
  label: string;
  lowConfidence: boolean;
  coachPick?: string;
}

export const PLAN_NAMES: Record<string, string> = {
  POS: "Possession",
  CTR: "Counter",
  PRS: "Press",
  BLK: "Defend",
  DIR: "Direct",
};

// ---------- M3: money ----------

export type Category =
  | "DUES" | "CDC" | "TOURNAMENT_FEE" | "KIT" | "WELFARE" | "DONATION"
  | "FIELD_RENTAL" | "EQUIPMENT" | "TRANSPORT" | "MATCH_FEE" | "OTHER";
export type Method = "CASH" | "TRANSFER" | "POS";
export type DueState = "PAID" | "PARTIAL" | "UNPAID";
export type Audience = "ACTIVE" | "ACTIVE_AND_TRIALISTS" | "SELECTED";

export interface CollectionSummary {
  id: string;
  title: string;
  type: Category;
  typeLabel: string;
  amountKobo: number;
  dueDate: string;
  recurring: boolean;
  open: boolean;
  overdue: boolean;
  memberCount: number;
  paidCount: number;
  partialCount: number;
  expectedKobo: number;
  collectedKobo: number;
}

export interface MemberDue {
  memberId: string;
  fullName: string;
  nickname?: string;
  jerseyNumber?: number;
  phone?: string;
  paidKobo: number;
  owedKobo: number;
  state: DueState;
}

export interface CollectionDetail {
  summary: CollectionSummary;
  members: MemberDue[];
}

export interface Entry {
  id: string;
  direction: "IN" | "OUT";
  category: Category;
  categoryLabel: string;
  amountKobo: number;
  member?: { id: string; name: string };
  collection?: { id: string; name: string };
  method: Method;
  occurredOn: string;
  note?: string;
  reversesId?: string;
  reversed: boolean;
  hasReceipt: boolean;
  flagged: boolean;
  recordedBy?: string;
  recordedAt: string;
}

export interface LedgerMonth {
  month: string;
  entries: Entry[];
  inKobo: number;
  outKobo: number;
  balanceKobo: number;
  flaggedCount: number;
}

export const METHOD_LABEL: Record<Method, string> = { CASH: "Cash", TRANSFER: "Transfer", POS: "POS" };

/** Multipart upload; the browser sets the boundary header itself. */
export async function upload<T>(path: string, file: Blob, filename = "receipt.jpg"): Promise<T> {
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetch(`/api${path}`, {
    method: "PUT",
    body: form,
    headers: { "X-CVG-Client": "cvg-admin" },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.code ?? "error", data?.message ?? "Upload failed.", data?.fields);
  return data as T;
}
