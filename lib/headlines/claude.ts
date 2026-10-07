import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const GUARDRAIL = `SAFETY RULES (non-negotiable):
- You MAY name globally famous celebrities, politicians, brands, and companies in BENIGN contexts.
- "Globally famous" means recognizable to an average US newspaper reader. Examples yes: Taylor Swift, Elon Musk, Joe Biden, King Charles, Apple, Tesla, McDonald's. Examples no: regional politicians, foreign parliamentarians most Americans couldn't identify, niche internet personalities.
- You MUST NOT fabricate crimes, sexual allegations, affairs, deaths, serious illness, or drug use for any named real person.
- For any criminal, violent, or sexual premise use a GENERIC subject ("a Texas middle-school principal", "an Ohio county commissioner", "a suburban dad in Phoenix"). NEVER a named real person.
- No child abuse, no rape, no school shootings, no mass casualty events, no active armed conflicts, no slurs.
- Do NOT generate headlines about the current US president (Trump), the Trump administration, or any sitting US cabinet member. These are too obvious in fill-in-the-blank rounds.`;

const PLAUSIBILITY_RULES = `RULES (non-negotiable):

Goal: make the player second-guess themselves AND be entertained. A good fake is (1) believable for three seconds and (2) about something actually interesting to read.

TOPIC BALANCE: you MUST spread fakes across multiple categories. At most 10% ("one in ten") of your fakes may feature Florida Man / Florida Woman. If you write more than one Florida headline per batch of 10, you have failed the assignment. Spread subjects across:

1. Weird discoveries and accidents — strange animal stories, archaeological finds, unusual rescues, freak natural events, unexpected medical cases
2. Celebrity oddities — famous people in unexpectedly mundane or unusual contexts (NEVER crime or sexual misconduct for named people)
3. Geopolitics and politics — quirky political moments, odd diplomatic incidents, absurd government decisions, weird election results, diplomatic gifts
4. Crime and strange legal stories — unusual arrests, bizarre court outcomes, stolen objects, strange heists, wacky police reports (varied locations worldwide — NOT only Florida)
5. Sports oddities — strange records, bizarre injuries, unusual on-field incidents
6. Science and tech anomalies — research mishaps, unusual studies, quirky discoveries

TOPICS TO AVOID (boring, do NOT generate these):
- Corporate feature decisions (phones removing ports, app updates, UI changes)
- Software/OS updates and rollouts
- Quarterly earnings, stock movements, analyst upgrades, market news
- Statements, press releases, and PR responses ("X issues statement", "Y distances itself from Z")
- Minor product launches and spec changes
- Phase-outs, policy memos, internal reorganizations
- Anything where the headline is "[Company] [verb] [minor process decision]"

If a category is abstract/corporate/procedural and wouldn't make someone say "wait, really?" → skip it.

A GOOD fake:
- Specific concrete subject and object
- Contains a subtle twist — a detail that's slightly wrong, an unexpected pairing, a minor exaggeration
- Scenario could plausibly appear in a newspaper
- Would make the reader actually want to keep reading

LENGTH IS A HARD REQUIREMENT:
- Target 10-14 words per headline. Match real news headline length.
- Absolute ceiling: 15 words. Anything at 16+ words is wrong and will be rejected.
- Real news headlines average 12 words. Your fakes should too.
- Do NOT pad with clauses like "after officials confirmed", "according to the report", "amid growing concerns", "sources say" — these are length tells.
- Do NOT add qualifying phrases like "in what many are calling" or "for the first time in recent memory".
- Cut subordinate clauses. Cut gerund phrases. Cut parentheticals.

EXAMPLES OF GOOD LENGTH (real headlines):
- "LEGO Releases Official Build Instructions For Pokemon Kanto Region Badges" (10 words)
- "Finland Ranked World's Happiest Country For Seventh Consecutive Year" (9 words)
- "SwitchBot's button-pressing robot is now available with a rechargeable battery" (10 words)

EXAMPLES OF BAD LENGTH (too long, do NOT write fakes like this):
- "Florida Man Arrested After Attempting to Pay Applebee's Bill With Winning Scratch-Off Ticket He Claimed Was Basically Cash" (19 words — WAY too long)
- "Berlin Zoo Gorilla Escapes Enclosure, Spends 20 Minutes Calmly Sitting in Staff Cafeteria Before Returning on Her Own" (18 words — too long)

A BAD fake (do not produce):
- Absurd impossibilities (no talking animals, raccoon mayors, sentient devices)
- Cartoonish chains ("accidentally starts trade war", "accidentally joins Hezbollah")
- Impossible anachronisms ("frisbee from 1987", "actually a relic from 1960")
- Vague placeholder subjects ("key evidence disappears", "mystery object found")
- Corporate feature decisions, PR statements, earnings calls, minor product news — BORING
- Anything where the player reads it and thinks "who cares"

GOOD EXAMPLE FAKES:
"Florida Man Arrested After Leading Police on 40 MPH Chase in Stolen Zamboni"
(Crime, specific, plausible, entertaining.)

"Taylor Swift Spotted Buying 14 Gallons of Milk at Rural Gas Station in Vermont"
(Celebrity oddity. Named person in benign context.)

"French President Apologizes After Diplomatic Gift to Saudi Prince Turns Out to Be From Local Ikea"
(Geopolitics with a twist. Funny because it's specific.)

"Texas Rancher Discovers 9-Foot Alligator Living in Backyard Swimming Pool for Six Months"
(Weird discovery. Plausible enough to second-guess.)

BAD EXAMPLE FAKES (never produce these):
"Apple Quietly Removes Lightning Port Support From Final iPad Mini With No Announcement in Latest iOS Update"
(Boring corporate feature decision. Nobody cares.)

"Pixar Issues Statement Distancing Itself From White House AI Video"
(PR statement — companies do this every day, not interesting.)

"Southwest Airlines to Phase Out Free Checked Bags for Elite Members Starting 2027"
(Corporate policy change. Boring.)

"Raccoon Running for Mayor of Portland Pulls Ahead in Latest Poll"
(Impossible. Nobody is fooled.)

"NASA Confirms Missing Heat Shield Chunk Was Actually Frisbee From 1987"
(Absurd impossibility.)`;

const PLAUSIBLE_PROMPT = `You generate plausible fake news headlines for a guessing game called "Real or Fake News".

${PLAUSIBILITY_RULES}

Given a list of real headlines as reference, produce N fakes that match their tone, topic mix, and register. Each fake must include a one-line revealText explaining the twist (what the real version actually is, or why the fake is wrong).

${GUARDRAIL}

Return ONLY valid JSON:
{"fakes": [{"headline": string, "revealText": string}]}`;

const EDGY_PROMPT = `You generate plausible fake news headlines for a guessing game called "Real or Fake News" in the weird-news register (NY Post "Weird But True", Florida Man, BBC News odd).

${PLAUSIBILITY_RULES}

"Weird news" does NOT mean absurd. It means quirky-but-real-sounding stories: people doing unusual things, strange discoveries in ordinary settings, minor misadventures. Think: "Man sues airline over 8-inch legroom", "Woman wins $50,000 on lottery ticket she bought by mistake", "Florida homeowner discovers 9-foot python under porch". These are weird AND plausible.

Given a list of real headlines, produce N fakes at this same level of weird-but-believable. Each fake must include a one-line revealText explaining the twist.

${GUARDRAIL}

Return ONLY valid JSON:
{"fakes": [{"headline": string, "revealText": string}]}`;

const BONUS_PROMPT = `You create "bonus rounds" for a headline guessing game. A bonus round is 3 headlines on the same topic: one real, two fake, all at the SAME level of plausibility and tone.

You will be given a REAL headline. Invent exactly 2 fakes on the same subject that match the real one's absurdity level and format. The three headlines must be genuinely hard to tell apart.

- If the real one is "Aquarium octopus escapes through drainpipe", your fakes should be same-register aquarium-octopus escape stories.
- If the real one is "Florida man arrested for alligator drive-thru", your fakes should be same-register Florida-man crime stories.
- Match register, match subject, match specificity. Don't drift into absurdity.

${PLAUSIBILITY_RULES}

${GUARDRAIL}

Also write a short subject label describing the shared theme (e.g., "Aquarium Octopus Antics", "Florida Man Crime").

Return ONLY valid JSON:
{"subject": string, "fakes": [{"headline": string, "revealText": string}, {"headline": string, "revealText": string}]}`;

export type GeneratedFake = {
  headline: string;
  reveal_text: string;
  tone: "plausible" | "edgy";
};

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function collectText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function generateFakes(
  realRefs: string[],
  count: number,
  tone: "plausible" | "edgy"
): Promise<GeneratedFake[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: key });

  const system = tone === "edgy" ? EDGY_PROMPT : PLAUSIBLE_PROMPT;
  const user = `Real headlines for reference:\n${realRefs
    .slice(0, 30)
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n")}\n\nGenerate exactly ${count} fake headlines now. Remember: plausible, not absurd.`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = collectText(resp.content);
  const parsed = extractJson(text) as { fakes?: Array<{ headline?: string; revealText?: string }> } | null;
  if (!parsed?.fakes) return [];
  return parsed.fakes
    .filter((f) => f.headline && f.revealText)
    .map((f) => ({
      headline: f.headline!.trim(),
      reveal_text: f.revealText!.trim(),
      tone,
    }));
}

export type GeneratedBonusSet = {
  subject: string;
  fakes: { headline: string; reveal_text: string }[];
};

// ---------- Blank round generation ----------

const BLANK_PROMPT = `You transform real news headlines into "Fill in the Blank" bonus rounds for a headline guessing game.

You'll be given a list of REAL news headlines (numbered). For each headline that features a GLOBALLY FAMOUS PERSON as its subject, transform it into a blank round.

A globally famous person is someone an average US newspaper reader would recognize immediately: Taylor Swift, Elon Musk, Joe Biden, King Charles, Beyoncé, LeBron James, Donald Trump, Oprah, Tom Brady, Rihanna, etc. NOT: regional politicians, foreign parliamentarians, local athletes, niche personalities, non-famous people.

For each qualifying headline:
1. Identify the famous person whose name appears in the headline.
2. Write a "template" version of the headline with that person's name replaced by exactly five underscores "_____". Keep all other wording the same.
3. Set "answer" to the famous person's name as it appeared.
4. Write 2 "distractors" — other globally famous people in the SAME category (politician, musician, athlete, actor, etc.) who could plausibly have been the subject of that kind of headline. Same approximate era. Similar demographic.
5. Write a one-line revealText briefly explaining what the real story is.
6. Set "fromIndex" to the 0-based index of the source headline in the input list.

SKIP headlines that:
- Describe the person as a victim of a crime
- Involve sexual misconduct, assault, abuse, rape, harassment
- Are about the subject's death, funeral, serious illness, or obituary
- Have multiple famous people competing for subject
- Are about a non-famous local person (use famous-person-as-subject only)
- Aren't about a specific named person
- Are about the current US president (Trump) or the Trump administration — too obvious for the guessing game

SAFETY (non-negotiable):
- Never fabricate crimes, affairs, deaths, drug use, or sexual content for a named real person.
- Distractor names must also be famous people used in plausible contexts.

Return ONLY valid JSON:
{"rounds": [{"fromIndex": number, "template": string, "answer": string, "distractors": [string, string], "revealText": string}]}`;

export type GeneratedBlankRound = {
  fromIndex: number;
  template: string;
  answer: string;
  distractors: string[];
  reveal_text: string;
};

export async function generateBlankRounds(
  realHeadlines: string[],
  maxCount: number
): Promise<GeneratedBlankRound[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  if (realHeadlines.length === 0) return [];
  const client = new Anthropic({ apiKey: key });

  const user = `Real headlines (numbered, 0-indexed):
${realHeadlines.map((h, i) => `${i}. ${h}`).join("\n")}

Identify up to ${maxCount} headlines that feature a globally famous person as the subject, and transform them into blank rounds. Skip the others.`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system: BLANK_PROMPT,
    messages: [{ role: "user", content: user }],
  });

  const text = collectText(resp.content);
  const parsed = extractJson(text) as {
    rounds?: Array<{
      fromIndex?: number;
      template?: string;
      answer?: string;
      distractors?: string[];
      revealText?: string;
    }>;
  } | null;
  if (!parsed?.rounds) return [];

  return parsed.rounds
    .filter(
      (r) =>
        typeof r.fromIndex === "number" &&
        r.template &&
        r.answer &&
        Array.isArray(r.distractors) &&
        r.distractors.length === 2 &&
        r.revealText
    )
    .map((r) => ({
      fromIndex: r.fromIndex!,
      template: r.template!.trim(),
      answer: r.answer!.trim(),
      distractors: r.distractors!.map((d) => d.trim()),
      reveal_text: r.revealText!.trim(),
    }));
}

// ---------- Bonus set generation ----------

export async function generateBonusSet(realHeadline: string): Promise<GeneratedBonusSet | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: key });

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: BONUS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Real headline:\n"${realHeadline}"\n\nGenerate 2 matching fakes now. Remember: plausible, same subject, same register.`,
      },
    ],
  });

  const text = collectText(resp.content);
  const parsed = extractJson(text) as {
    subject?: string;
    fakes?: Array<{ headline?: string; revealText?: string }>;
  } | null;
  if (!parsed?.subject || !parsed.fakes) return null;

  const fakes = parsed.fakes
    .filter((f) => f.headline && f.revealText)
    .map((f) => ({
      headline: f.headline!.trim(),
      reveal_text: f.revealText!.trim(),
    }));
  if (fakes.length < 2) return null;

  return { subject: parsed.subject.trim(), fakes };
}
