# Real or Fake?

![tests](https://github.com/ChuchoMonster/real-or-fake-headlines/actions/workflows/tests.yml/badge.svg)

A headline guessing game. Each round shows a news headline styled as a newspaper front page and
the player decides whether it is **real** or **fake**. Real headlines are pulled from news APIs
and RSS feeds; fakes are written by Claude to match the tone, length and plausibility of the real
ones. One wrong answer ends the run, so the score is a streak.

## How it works

**Content pipeline (offline, cron-driven)**

1. `app/api/cron/ingest-headlines` pulls real headlines from NewsAPI, Reddit, Google News RSS
   and a list of newspaper RSS feeds (`lib/sources/`).
2. Headlines are de-duplicated by normalized text and run through a quality filter
   (`lib/ingestion/quality.ts`): length caps, topic blocklists (violence, active conflicts,
   etc.), boring-category filters and syndication-template rejection.
3. Claude (`lib/headlines/claude.ts`) generates three kinds of content in batches:
   - plausible and "edgy" fake headlines, calibrated against a sample of the real pool;
   - **bonus rounds**: one real headline plus Claude-written look-alikes, pick the real one;
   - **fill-in-the-blank rounds**: a real headline about a famous person, with distractors.
4. Everything is written to a Supabase `headlines` table with a rolling 10-day retention.
   `app/api/cron/regen-fakes` regenerates only the fakes, for prompt iteration.

Both cron routes require `Authorization: Bearer $CRON_SECRET`.

**Game (request time)**

- `app/api/headlines` builds a round sequence from the pool (`lib/pool/read.ts`): skips
  headlines the signed-in user has already seen, balances real vs fake, caps over-represented
  topics, re-applies the quality filter, and mixes in bonus/blank rounds on their own cadence.
- `components/Game.tsx` is the client-side state machine (start, round, reveal, game over).
- Every answer is logged fire-and-forget to `app/api/answer` for per-headline difficulty stats.
- Scores go to a daily / weekly / all-time leaderboard. Playing does not require an account.

**Accounts**

Supabase Auth (magic link, plus email/password routes). Display names are validated for length,
reserved words, profanity and Unicode look-alike characters (`lib/auth/validateDisplayName.ts`).
Users can rename, sign out everywhere, or delete their account from `/settings`.

## Stack

- Next.js 16 (App Router, `proxy.ts` session refresh) + React 19 + TypeScript
- Tailwind CSS v4
- Anthropic SDK (`@anthropic-ai/sdk`), model `claude-sonnet-4-6`
- Supabase (Postgres, Auth, row-level security)
- NewsAPI, Reddit JSON, Google News RSS, `rss-parser`
- `html-to-image` + Web Share API for shareable score cards

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

Then seed the headline pool once by calling the ingestion route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest-headlines
```

In production, schedule that call daily (Vercel Cron, Netlify scheduled function, etc.).

### Environment variables

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key for browser and server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; ingestion and answer logging bypass RLS |
| `ANTHROPIC_API_KEY` | Generating fake, bonus and fill-in-the-blank rounds |
| `NEWSAPI_KEY` | NewsAPI top headlines |
| `REDDIT_USER_AGENT` | Identifies the app to Reddit's public JSON endpoints |
| `CRON_SECRET` | Protects the two cron routes |

### Database

The app uses these Supabase tables: `headlines`, `scores`, `profiles`, `headline_answers` and
`user_seen_headlines`. **Note:** `supabase/schema.sql` is the early leaderboard-only schema and
does not yet include the other tables; their columns can be read from the queries in
`lib/ingestion/insert.ts`, `lib/pool/read.ts` and the `app/api/` routes.

## Tests

```bash
npm test   # vitest; no API keys, database or network needed
```

- Round building: the opening mix of real and fake, round 4 always a bonus, bonus/blank spacing, Florida cap, seen-headline filtering, and which bonus and blank rounds count as well-formed.
- Headline cleaning: the quality filter, de-duplication, publication-suffix stripping, and parsing of NewsAPI, Reddit and Google News responses.
- Claude output: pulling JSON out of the model's reply and dropping incomplete fakes, bonus sets and fill-in-the-blank rounds (Anthropic SDK mocked).
- Leaderboard and accounts: the score ceiling, rank calculation, answer logging, display-name rules and sign-up checks (Supabase mocked).
- CI runs the suite on every push and pull request (`.github/workflows/tests.yml`).

## Project layout

```
app/
  api/cron/ingest-headlines   fetch, filter, generate, insert, prune
  api/cron/regen-fakes        regenerate fakes only
  api/headlines               build a game's round sequence
  api/answer, api/scores      answer logging, leaderboard
  api/auth, api/account       sign-in / sign-up / account deletion
  sign-in, onboarding, settings, terms
components/                   game screens, newspaper renderer, leaderboard, share card
lib/
  sources/                    NewsAPI, Reddit, Google News, RSS adapters
  ingestion/                  dedup, quality filter, inserts
  headlines/claude.ts         all Claude prompts
  pool/read.ts                round selection
  supabase/                   browser, server and service-role clients
```

`CLAUDE.md` contains the build notes and prompt-tuning lessons from development (headline length,
topic balance, plausibility calibration, content-safety filters).

## Controls

- Desktop: Left arrow = REAL, Right arrow = FAKE
- Mobile: swipe the newspaper (on-screen FAKE / REAL arrows show the direction)
- Enter / Space: dismiss the reveal screen
