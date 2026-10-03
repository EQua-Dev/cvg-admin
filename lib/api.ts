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

// ---------- M4: training ----------

export type SessionKind = "COMPULSORY" | "OPTIONAL";
export type SessionStatus = "SCHEDULED" | "CLOSED" | "CANCELLED";
export type Availability = "IN" | "OUT";
export type OutReason = "INJURED" | "SICK" | "TRAVELLING" | "WORK" | "FAMILY" | "OTHER";
export type Mark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export interface Pattern {
  id: string;
  weekday: number;
  startTime: string;
  venue: string;
  kind: SessionKind;
}

export interface Session {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  venue: string;
  kind: SessionKind;
  impromptu: boolean;
  focus?: string;
  status: SessionStatus;
  inCount: number;
  outCount: number;
  markedCount: number;
  me?: { status: Availability; reason?: OutReason; locked: boolean; lockAt: string };
  myMark?: Mark;
}

export interface RosterRow {
  memberId: string;
  fullName: string;
  nickname?: string;
  jerseyNumber?: number;
  availability: Availability;
  reason?: OutReason;
  mark?: Mark;
}

export interface SessionDetail {
  session: Session;
  roster?: RosterRow[];
}

export interface MemberAttendance {
  memberId: string;
  fullName: string;
  jerseyNumber?: number;
  percent?: number;
  counted: number;
  attended: number;
  late: number;
  excused: number;
  absent: number;
  streak: number;
  extras: number;
  noShows: number;
}

export const REASON_LABEL: Record<OutReason, string> = {
  INJURED: "Injured", SICK: "Sick", TRAVELLING: "Travelling", WORK: "Work", FAMILY: "Family", OTHER: "Other",
};

// ---------- M5: matches ----------

export type MatchSide = "HOME" | "AWAY" | "NEUTRAL";
export type MatchType = "FRIENDLY" | "TOURNAMENT" | "LEAGUE" | "INTERNAL";
export type MatchStatus = "SCHEDULED" | "PLAYED" | "CANCELLED";
export type GamePlan = "POS" | "CTR" | "PRS" | "BLK" | "DIR";
export type GoalKind = "OPEN_PLAY" | "PENALTY" | "FREE_KICK" | "HEADER";
export type Factor = "POSITION" | "OVR" | "PLAN" | "ATTENDANCE" | "FORM" | "DUES";

export interface MatchView {
  id: string;
  opponent: string;
  kickoffAt: string;
  date: string;
  time: string;
  meetTime?: string;
  venue: string;
  side: MatchSide;
  type: MatchType;
  teamSize: number;
  gamePlan?: GamePlan;
  planB?: GamePlan;
  kit?: string;
  feeKobo?: number;
  notes?: string;
  status: MatchStatus;
  formation?: string;
  lineupPublished: boolean;
  ourScore?: number;
  theirScore?: number;
  outcome?: "W" | "D" | "L";
  inCount: number;
  outCount: number;
  me?: { status: Availability; reason?: OutReason; locked: boolean; lockAt: string };
  myLineup?: "STARTING" | "BENCH";
  potmOpen: boolean;
  votedPotm: boolean;
  gaveOpinion: boolean;
  inSquad: boolean;
}

export interface FormationSlot { idx: number; position: string; x: number; y: number }
export interface Formation { name: string; teamSize: number; slots: FormationSlot[] }

export interface MatchOptions {
  formations: Formation[];
  gamePlans: { code: GamePlan; label: string }[];
  opponents: string[];
  venues: string[];
  tags: string[];
}

export interface SquadRow {
  memberId: string;
  fullName: string;
  nickname?: string;
  jerseyNumber?: number;
  position?: string;
  availability: Availability;
  reason?: OutReason;
}

export interface SlotView {
  idx: number;
  position?: string;
  x?: number;
  y?: number;
  memberId?: string;
  guestName?: string;
  name?: string;
  jerseyNumber?: number;
  photoUrl?: string;
}

export interface LineupView {
  formation: string;
  slots: SlotView[];
  bench: SlotView[];
  benchSize: number;
  captainId?: string;
  penaltyTakerId?: string;
  freeKickTakerId?: string;
  cornerTakerId?: string;
  publishedAt?: string;
}

export interface PersonRef { memberId?: string; guestName?: string; name: string; jerseyNumber?: number }

export interface ResultView {
  ourScore: number;
  theirScore: number;
  goals: { seq: number; scorer?: PersonRef; ownGoal: boolean; assist?: PersonRef; minute?: number; kind?: GoalKind }[];
  appearances: { person: PersonRef; started: boolean; position?: string }[];
  cards: { person: PersonRef; colour: "YELLOW" | "RED"; minute?: number }[];
  cleanSheets: string[];
  feeCollectionId?: string;
}

export interface Tally { memberId: string; name: string; votes: number }

export interface PotmView {
  open: boolean;
  closesAt?: string;
  canVote: boolean;
  myVote?: string;
  votesCast: number;
  voters: number;
  nominees: { memberId: string; name: string; jerseyNumber?: number; photoUrl?: string }[];
  tally?: Tally[];
  winners: Tally[];
}

export interface OpinionView {
  authorId?: string;
  authorName?: string;
  commendTags: string[];
  commendText?: string;
  critiqueTags: string[];
  critiqueText?: string;
  selfRating?: number;
}

export interface OpinionsView {
  count: number;
  tags: { tag: string; praised: number; criticised: number }[];
  items: OpinionView[];
  mine?: OpinionView;
  allTags: string[];
}

export interface MatchDetail {
  match: MatchView;
  lineup?: LineupView;
  result?: ResultView;
  potm?: PotmView;
  opinions?: OpinionsView;
}

export interface Candidate {
  memberId: string;
  name: string;
  fullName: string;
  jerseyNumber?: number;
  photoUrl?: string;
  favoured?: string;
  otherPositions: string[];
  available: boolean;
  label?: string;
  factors: Partial<Record<Factor, number>>;
  slotScores: Record<string, number>;
  planBScore?: number;
  goals: number;
  assists: number;
  potmVotes: number;
  attendancePercent?: number;
  ovrs: Partial<Record<"GK" | "DEF" | "MID" | "ATT", number>>;
}

export interface SelectionView {
  formation: Formation;
  benchSize: number;
  weights: Partial<Record<Factor, number>>;
  configured: Record<Factor, number>;
  unavailableFactors: Factor[];
  candidates: Candidate[];
  suggestion: Record<string, string>;
  benchSuggestion: string[];
}

export const FACTOR_LABEL: Record<Factor, string> = {
  POSITION: "Position", OVR: "Rating", PLAN: "Plan fit", ATTENDANCE: "Training", FORM: "Form", DUES: "Dues",
};
export const TYPE_LABEL: Record<MatchType, string> = { FRIENDLY: "Friendly", TOURNAMENT: "Tournament", LEAGUE: "League", INTERNAL: "Internal" };
export const SIDE_LABEL: Record<MatchSide, string> = { HOME: "Home", AWAY: "Away", NEUTRAL: "Neutral" };

// ---------- M6: ratings and FUT cards ----------

export type PositionGroup = "GK" | "DEF" | "MID" | "ATT";
export type Tier = "BRONZE" | "SILVER" | "GOLD" | "ELITE";
export interface RatingWindowView { id: string; title: string; opensAt: string; closesAt: string; open: boolean; closedAt?: string; finished: number; raters: number; cards?: number }
export interface StatSetsView {
  sets: { group: PositionGroup; attrs: string[]; labels: string[] }[];
  attributes: { code: string; label: string; title: string; block: string }[];
}
export interface CardView {
  memberId: string; name: string; fullName: string; jerseyNumber?: number; position?: string; group?: PositionGroup;
  ovr?: number; tier?: Tier; published: boolean; stats: { code: string; label: string; value?: number; peers: number }[];
  bestGroup?: PositionGroup; groups: { group: PositionGroup; ovr?: number; published: boolean }[]; round: string;
}
export const TIER_LABEL: Record<Tier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", ELITE: "CVG Elite" };
export const GROUP_LABEL: Record<PositionGroup, string> = { GK: "Goalkeepers", DEF: "Defenders", MID: "Midfielders", ATT: "Attackers" };
