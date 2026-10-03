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
