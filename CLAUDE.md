@AGENTS.md

# Real or Fake News — Project Context

## Game-Creation Process (Replicable Playbook)

This project followed a specific build sequence that worked well. Use this as a template for future quiz/game projects.

### Phase 1: Scaffold with Mock Data
- Scaffold the full Next.js project (App Router + TypeScript + Tailwind)
- Build the COMPLETE game loop end-to-end with hardcoded mock data — start screen, gameplay, reveal, game over, play again
- No API keys needed, no database, no auth. Just a working UI loop
- This lets you feel the game and iterate on mechanics before any infrastructure exists
- Key: the mock data should be realistic enough to evaluate gameplay, not placeholder "lorem ipsum"

### Phase 2: Core Game Mechanics
- Design scoring system (points per correct, bonus points, streak tracking)
- Build round types — start simple (binary real/fake), add complexity later (multi-choice bonus, fill-in-the-blank)
- Build the state machine carefully: start → round → reveal (correct) → next round OR wrong → game over
- Add the game-over screen with score card, play again. Keep it one screen (don't split reveal + game over into two pages)
- Add the ToS/privacy checkbox before first play (resets per session)

### Phase 3: Auth & Leaderboards
- Supabase Auth (magic link email first, Google OAuth later)
- Profiles table (display_name, unique, 3-20 chars)
- Display name moderation: reserved names, profanity deny-list, Unicode homoglyph normalization
- Scores table with RLS (public read, owner insert)
- Leaderboard: daily/weekly/all-time tabs with user rank
- Settings page: change name, sign out everywhere, delete account
- Logged-out users can still play; sign-in prompt on game over

### Phase 4: Content Pipeline (the hardest part)
- Multi-source ingestion: NewsAPI, Reddit, RSS feeds, Google News
- Claude generates fake content in batches (plausible + edgy tones)
- Bonus round generation: Claude matches tone/register of the real headline
- Blank round generation: Claude identifies famous-person headlines and creates distractors
- Dedup by normalized text at insert time
- Quality filter at BOTH insert time AND read time (catches bad content already in DB)
- 10-day rolling retention with daily cleanup
- Cron route protected by CRON_SECRET, manually triggered in dev, Vercel Cron in prod
- Separate regen-fakes route for prompt iteration without re-fetching sources

### Phase 5: Content Quality Iteration (expect 5+ rounds)
This is where most of the time goes. Key lessons learned:

**Headline length**: Real headlines average ~13 words. Claude defaults to 17-18 words unless HARD-CAPPED. Use explicit word count targets in the prompt AND a server-side filter that rejects fakes over the cap. Specify both "target 10-14 words" AND "absolute ceiling 15 words."

**Topic diversity**: Claude pattern-matches on whatever reference sample you feed it. If 30% of your sample is Florida Man, 50% of your fakes will be Florida Man. Fix: exclude over-represented topics from the reference sample, add explicit topic balance rules to the prompt ("at most 10% of fakes should be Florida Man"), AND cap at read time (max 2 Florida headlines per game).

**Absurdity matching**: Fakes must match the plausibility level of reals. Early Claude outputs are too cartoonish (raccoon elected mayor, DoorDasher starts trade war). Fix: add explicit GOOD/BAD examples to the prompt showing the boundary. Good = "Taylor Swift spotted buying 14 gallons of milk at rural gas station." Bad = "Raccoon running for mayor of Portland."

**Entertainment value**: Headlines must be interesting, not just tricky. Corporate feature decisions ("Apple removes Lightning port"), PR statements ("Pixar issues statement"), and earnings reports are boring. Explicitly ban these categories in the prompt AND in the quality filter.

**Specificity**: Vague subjects ("key evidence disappears", "mystery object found") are unplayable. Headlines need specific, concrete nouns — names, places, dollar amounts, products.

**Source quality**: Google News "weird news" queries return local syndication garbage ("Unusual story of Gombe varsity student"). Narrow queries to specific known-good patterns; reject headlines matching syndication-column templates.

**Content safety**: Filter out sexual assault, child abuse, mass shootings, active armed conflicts (Gaza/Lebanon/Ukraine), and school shootings — regardless of whether the headline is real or fake. These are never playable. Also: Claude WILL violate your guardrails sometimes. Apply content filters server-side as a safety net; don't rely solely on the prompt.

### Phase 6: Visual Polish & UX
- Newspaper component with randomized styles (8 variants, all neutral palette, fake publication names)
- Spin-in animation (fast clockwise, washing-machine energy, 1 second)
- Masthead always smaller than headline (adaptive sizing based on headline length)
- Taunting lines on wrong answer with emoji (picked randomly per game)
- Praise lines on correct bonus answers (hold an extra second to read)
- Differentiated wrong screens: "Fake News" when you fell for a fake, "Gotcha!" when you distrusted a real
- Badges at point thresholds (displayed on game-over screen)
- Shareable score card (html-to-image capture + Web Share API + download fallback)
- Real Headlines Seen sidebar tracker with source links

### Phase 7: Analytics & Tracking
- Log every answer: headline_id, user_id, was_correct, round_kind, timestamp
- Fire-and-forget from client (non-blocking, keepalive: true)
- Service role admin client for writes (bypasses RLS)
- Enables: trick rate per headline, user skill tracking, difficulty calibration, content optimization

### Phase 8: Pre-Launch (after design pass)
- Custom SMTP sender (Resend/Postmark) for magic-link emails
- Deploy to Vercel, update Supabase redirect URLs
- Set up Vercel Cron for daily ingestion
- Server-authoritative game scoring (prevent console cheats)
- @vercel/og for social link preview cards
- Rotate API keys (especially any pasted in chat)
- Tests (API route validation, headline shape)
- NewsAPI commercial license if monetizing

## Architecture Notes
- **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Anthropic SDK
- **Supabase client pattern**: browser client (lib/supabase/client.ts), server client (lib/supabase/server.ts), admin/service-role client (lib/supabase/admin.ts), proxy.ts for session refresh
- **Next.js 16**: uses `proxy.ts` not `middleware.ts`; function export is `proxy` not `middleware`
- **Headlines DB**: kind='normal'|'bonus'|'blank', is_real boolean, bonus_group UUID for grouping, blank_template/answer/distractors for fill-in-blank
- **Read path**: pool/read.ts pulls candidates, filters seen (per-user), balances real/fake, caps topic frequency, applies quality filter, builds sequence with independent bonus cadences
- **Quality filter**: applied at insert AND read time; pattern-based (regex) + event-verb allowlist + length cap

## Current State
- Game is fully playable in dev at localhost:3000
- ~523 headlines in pool (401 real, 76 fake, 16 blank, 30 bonus)
- Auth works (magic link email)
- Leaderboard works (day/week/all-time)
- Answer tracking is live (headline_answers table)
- Design pass is NEXT — user wants to focus on visual design before deployment
- Mobile swipe gestures planned (right=REAL, left=FAKE) for mobile design pass
