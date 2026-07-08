# 🃏 Poker Bank

A simple web app to manage poker home games: run a live session with buy-ins and
re-buys, track the ledger, settle everyone's debts with the fewest payments, and
follow each player's profit/loss over time.

Built with **React + Vite + TypeScript** and **Supabase** (hosted Postgres + auth).
The data lives in the cloud so it follows you across your phone and laptop, behind
a single private login.

## One-time setup

### 1. Create a Supabase project (free)

1. Go to <https://supabase.com>, create an account, and make a new project.
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
   four tables (`players`, `sessions`, `session_players`, `buy_ins`) and the Row
   Level Security policies that keep your data private.
3. Open **Project Settings → API** and copy the **Project URL** and the
   **anon / public** key.

> Optional: under **Authentication → Providers → Email**, you can turn off
> "Confirm email" so you can sign in immediately after creating your account.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

(The anon key is safe to ship to the browser — access is enforced by the RLS
policies, not by keeping the key secret.)

### 3. Install & run

```bash
npm install
npm run dev
```

Open the printed URL, create your account, and you're in.

## Using it

1. **Roster** — on the Home page, add the people you play with. They persist so
   their stats accumulate across sessions.
2. **Start a game** — name it (optional), tick who's playing, hit *Start game*.
3. **During the game** — for each player use **+ Buy-in** to record a buy-in or
   re-buy (they stack), and **Cash out** to record their final chip stack. The
   ledger shows buy-in, buy-out, and net live. You can add or remove players
   mid-game.
4. **End & settle** — once everyone has cashed out, hit *End game & settle*. You'll
   get the minimum set of payments (e.g. "Alice → Bob $40"). If the ledger doesn't
   balance (chips ≠ cash), a warning shows so you can fix a buy-out.
5. **History** — past sessions and each player's career P/L.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm test` | Run the settlement unit tests (vitest) |
| `npm run preview` | Preview the production build |

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages). Point it at this repo,
set the build command to `npm run build` and output dir to `dist`, and add the two
`VITE_SUPABASE_*` environment variables in the host's dashboard.

## How settlement works

Each player's net is `buy_out − total_buy_in`. The settle algorithm
([`src/lib/settle.ts`](src/lib/settle.ts)) greedily matches the biggest debtor to
the biggest creditor until everyone is square — a near-minimal number of payments.
All math is done in integer cents to avoid floating-point rounding errors.
