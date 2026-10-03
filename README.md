# cvg-admin

**The Desk**: the management web app for CVG FC (admins, coaches, treasurer, captains).
Part of the CVG FC Club Management System, built by Devstrike Digital Limited.

- **Stack:** Next.js 16 · React 19 · TypeScript
- **API:** [cvg-backend](https://github.com/EQua-Dev/cvg-backend) (Kotlin Spring Boot)
- **Plan:** [content plan](https://github.com/EQua-Dev/cvg-backend/blob/main/docs/CONTENT_PLAN.md)

## What's in it

| Screen | What it does |
|---|---|
| Sign in | Phone + passcode. First time: last 4 digits of the phone. Members without a management role are sent to the Club app |
| Set passcode | Short steps, one box per screen. Shown after a first sign-in, with "Skip for now" |
| Home | Squad counts, current season, "+ Add member" |
| Squad | Search by name or jersey, filter by status |
| Add member | Name, phone, nickname, jersey, Trialist/Active, roles. Then **Send on WhatsApp** opens that member's chat with their private join link |
| Member | Profile (positions, foot, strengths, emergency contact) and playing style · tap to change status or roles · Edit details · **Send join link** · **Reset passcode** (then tell them on WhatsApp) |
| Seasons | Add a season (pre-filled Sept–Aug), make one active (under Me) |
| **Money** (admin, treasurer) | Club balance, this month in/out, receipt warnings. **Collections**: start monthly dues (repeat by themselves on the 1st) or one-off collections for active / active+trialists / picked members |
| Collection | Collected vs expected, paid/part/owes filter. **Tap a name → "Record ₦2,000 paid"** (amount pre-filled, Cash/Transfer/POS). 💬 reminder per person, one WhatsApp reminder listing everyone who still owes, close |
| Money in / out | Donations and other income; expenses with type, details, date and a 📷 receipt photo |
| Ledger | Month by month, grouped by day. Tap an entry: details, add/view receipt, or reverse a mistake (a correcting entry; nothing is ever deleted) |
| **Training** (admin, coach, captain) | Upcoming sessions with in/out counts, next session up top. **Weekly schedule**: add a day + time + compulsory/optional slot; the next 14 days fill in by themselves. **Impromptu** session in three taps |
| Session | **Who's coming**: everyone starts "In"; tap to set someone out with a one-tap reason. **Attendance**: big rows, tap in → out → clear, hold for Late/Excused. Works with no signal (taps queue as "⚡ N queued" and send when back online). Close the session (unmarked count as absent); after closing only coach/admin can fix marks, and fixes are logged |
| Attendance report | Season %, attended/counted, streak, optional extras and no-shows per player (late counts as present, excused doesn't count) |
| **Matches** (admin, coach, captain) | Coming up / results. **New match** in taps: opponent (remembers past ones), day, kick-off, meet time, venue, 5/7/9/11-a-side, home/away, type, game plan + Plan B, kit, optional fee |
| Match · Squad | Everyone "In" by default; tap to set someone out with a reason |
| Match · Lineup | Formation chips, pitch board. **✨ Auto-fill** picks the best available XI and bench. Tap any spot: players ranked for that spot with a 0–100 score (position, plan fit, training, form, dues) and why. Guests by name, captain and set-piece takers, ⚙ to change what counts for this match. Publish, then **Share lineup on WhatsApp** |
| Match · Result | Score steppers, tap who scored and assisted, who played (pre-filled from the lineup). Saving opens a 48h POTM vote and, if there's a fee, a match-fee collection. Then: votes cast, close early, winner, and what the squad said (tag bars plus each opinion with the author's name) |
| **FUT ratings** (admin, coach; from Squad or Home) | Open a round (name, 3/7/14 days), watch "14 of 18 have rated everyone" (never who gave what), close it to make the cards. Change the 6 card stats per position group with chips (no re-vote). Cards list with OVR, tier and best-fit group. The lineup picker shows each player's OVR for the spot |
| Me | Change passcode, sign out |

Only admins can change things; coaches, treasurers and captains can view for now.

## Run locally

```bash
npm install
CVG_API_URL=http://localhost:8080 npm run dev     # http://localhost:3001
```

The browser only talks to this app; `/api/*` is proxied to `CVG_API_URL`, so the session cookie is first-party and no CORS is needed.

| Variable | Default | Notes |
|---|---|---|
| `CVG_API_URL` | `http://localhost:8080` | cvg-backend base URL (server side) |
| `NEXT_PUBLIC_CLUB_URL` | `https://club.cvgfc.ng` | Link put in the passcode-reset WhatsApp message (join links come from the API) |

```bash
npm run typecheck && npm run build
```
