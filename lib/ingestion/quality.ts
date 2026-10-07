// Rejects headlines that aren't fun to guess: clickbait templates, local
// "unusual story of <random person>" syndication, video stubs, live tickers.
// Applied at both insert time (dedup.ts) and read time (pool/read.ts) so
// rows already in the DB never reach players.

const BAD_PATTERNS: RegExp[] = [
  // "Unusual/Strange/Weird/Bizarre story/stories/tales of/from/about …"
  // — anywhere in the headline, not just the start
  /\b(unusual|strange|weird|bizarre|incredible|amazing|heartwarming|inspiring|shocking|remarkable|touching)\s+(story|stories|tale|tales|case|cases|journey|journeys)\s+(of|from|about|at|behind)\b/i,

  // "Strange but true" — a syndicated column label that sneaks into news feeds
  /\bstrange\s+but\s+true\b/i,

  // Vague placeholder subjects — unplayable because there's no specific thing
  // to evaluate ("key evidence", "mystery object", "the discovery")
  /\b(key|critical|vital|important|mysterious|unknown|missing)\s+(evidence|clue|clues|object|item|items|document|documents|detail|details)\b/i,
  /\b(mystery|unknown)\s+(object|item|figure|person|caller|buyer|seller)\b/i,

  // Absurd Claude patterns we've seen produced despite guardrails — anachronism
  // punchlines, "accidentally" triggers world events, animals in offices.
  /\baccidentally\s+(start|starts|join|joins|cause|causes|trigger|triggers|launch|launches|declare|declares)\s+(a\s+|an\s+|new\s+)?(war|trade|policy|alliance|treaty|mailing|hezbollah|revolution|lawsuit)/i,
  /\bturned?\s+out\s+to\s+be\s+(a|an|someone's|somebody's)\s+.+\s+from\s+(18|19|20)\d{2}\b/i,
  /\b(frisbee|skateboard|toaster|tupperware|barbie|pokemon|stapler)\s+from\s+(18|19|20)\d{2}\b/i,
  /\b(raccoon|pigeon|squirrel|goat|duck|chicken|octopus|dolphin|cat|dog|horse|cow|pig|rat|possum|opossum)\s+(running|runs|elected|appointed|named|chosen)\s+(for\s+)?(mayor|president|senator|governor|judge|sheriff)\b/i,
  /\belected\s+to\s+(homeowners|hoa|school)\s+(association|board)/i,
  /\bachieves?\s+sentience\b/i,
  /\b(demands?|negotiates?|refuses)\s+(better|higher|new)\s+(ventilation|salary|benefits|terms|conditions)\s+.*(machine|robot|ai|card|device|appliance)/i,

  // Boring corporate / tech / PR content — unplayable because it's not entertaining
  /\b(quietly|silently|discreetly)\s+(removes?|adds?|updates?|rolls?\s+out|announces?|drops?)/i,
  /\b(ios|ipados|macos|android|windows)\s*\d*\s*(update|rollout|beta|release)\b/i,
  /\b(lightning|usb[- ]?c|usb[- ]?a|headphone|hdmi)\s+(port|jack|connector)\b/i,
  /\b(issues?|releases?|publishes?)\s+(a\s+)?(statement|press\s+release|response|apology|clarification)\b/i,
  /\b(distances?|distancing)\s+(itself|themselves|themselves)\s+from\b/i,
  /\b(q[1-4]|quarterly|fiscal)\s+(earnings|results|revenue|profit|loss|report)\b/i,
  /\bstock\s+(rises?|falls?|jumps?|plunges?|rallies?|sinks?|soars?|drops?)\s+(on|after|as|\d+)/i,
  /\b(shares?|stock)\s+(up|down|hit)\s+\d+/i,
  /\bupgraded?\s+to\s+(buy|hold|sell|outperform|overweight|underweight)/i,
  /\b(quarterly|annual)\s+(report|filing|disclosure)/i,
  /\b(phase[- ]out|phase\s+out|phases\s+out|phased\s+out)\s+/i,
  /\b(software|firmware|driver)\s+(update|patch|rollout|upgrade|downgrade)\b/i,
  /\b(product|feature|service)\s+(launch|rollout|sunset|shutdown|discontinuation)\b/i,
  /\bunveils?\s+new\s+(logo|branding|website|design|ui|interface|menu|app|policy|feature)\b/i,
  /\bdiscontinues?\s+(the|its|their|service|product|line|subscription|plan)\b/i,
  /\bceo\s+(hires|fires|appoints|steps\s+down|resigns|departs|leaves|joins)\b/i,
  /\b(acquires?|merges?\s+with|spins?\s+off)\s+\w+\s*(inc|corp|llc|ltd|co\.?)\b/i,
  /\b(layoffs?|layoff|workforce\s+reduction|headcount|downsizing|restructuring)\b/i,
  /\b(amazon|google|microsoft|apple|meta|netflix|uber|tesla|gopro|samsung|sony)\s+(rolls?\s+out|launches?|updates?|releases?|announces?|unveils?|adds?|removes?)\s+(new\s+)?(feature|policy|plan|subscription|tier|version|model|update|camera|phone|device|product|gadget|accessory)/i,
  /\b(launches?|unveils?|introduces?|announces?)\s+(a\s+|an\s+|its\s+|the\s+|new\s+)*(camera|phone|tablet|laptop|headset|speaker|smartwatch|drone|wearable|gadget)\b/i,

  // "The/A story of <Name>"
  /^(the|a)\s+(story|tale|case|journey)\s+of\s+[A-Z]/i,

  // "<someone> reveals the story behind ..." — profile piece
  /\breveals?\s+(the\s+)?(story|reason|reasons|inspiration|meaning|secret|truth)\s+behind\b/i,
  /\bopens?\s+up\s+about\b/i,
  /\bshares?\s+(her|his|their)\s+(story|journey|secret)\b/i,

  // Clickbait
  /you\s*(wo(?:n'|n)t|will\s*not|can'?t|cannot|wouldn'?t)\s*believe/i,
  /wait\s+(?:until|till)\s+you\s+see/i,
  /guess\s+what\s+(happened|he|she|they)/i,

  // Leading video/live/watch/photo cruft — allow up to 2 words before the colon/dash
  /^(video|watch|live|photo|photos|gallery|slideshow|in\s+pictures|pics?|exclusive|breaking|update|video\s+pick|photo\s+pick|pick)(\s+\w+){0,2}\s*[:\-–|]/i,

  // Live blog / live updates / live score headlines (no punchline)
  /\blive(\s+updates|\s+score|\s+blog|\s+thread|:\s+|stream)/i,

  // Listicles and roundups — structural
  /^\d+\s+(things|reasons|ways|photos|signs|rules|facts|times|moments|of|best|worst)\b/i,
  /^(the\s+)?\d+\s+(best|worst|weirdest|strangest|funniest|craziest|wildest|most)\b/i,
  // Anything-ranked listicles: "25 Margaret Qualley Movies & Shows Ranked"
  /^\d+\s+[\w\s&'.,-]+\b(movies|shows|films|songs|albums|books|games|places|recipes|tips|hacks|apps|tools|scenes|quotes|foods|drinks|restaurants|hotels|destinations|animals|pets|stars|celebrities)\b/i,
  // Ranked / listed / rated at end
  /\b(ranked|listed|rated|reviewed)\s*$/i,
  /^(quiz|poll|explainer|guide|recap|roundup|digest|review):/i,

  // Sports opinion takes
  /\boffers?\s+(bizarre|hot|unusual|surprising|candid|tough|bold|blunt|savage)?\s*(take|view|opinion|verdict|assessment|reaction|warning|response)\b/i,
  /\bgives?\s+(his|her|their)\s+(take|view|opinion|verdict)\b/i,
  /\b(reaction|reactions|reacts|reacting)\s+to\s+/i,

  // Music / album / tour announcements
  /\b(announce|announces|announced)s?\s+(new\s+)?(album|tour|reissue|single|ep|lp|record|deluxe|vinyl|compilation)\b/i,
  /\b(reissue|reissued|deluxe\s+edition|remaster(ed)?|anniversary\s+edition)\b/i,
  /\breleases?\s+(new\s+)?(album|single|ep|lp|music\s+video|trailer|teaser|track)\b/i,
  /\bdrops?\s+(new\s+)?(single|track|album|ep|music\s+video|mv)\b/i,
  /\btour\s+dates?\b/i,
  /\b(album|ep|lp|single|track|concert|gig)\s+review\b/i,
  /\b(stream|streaming|premier(e|es))\s+(new\s+)?(song|single|track|album|ep)\b/i,

  // Book/movie/TV release announcements
  /\b(announce|announces|announced)\s+(new\s+)?(book|novel|memoir|movie|film|series|season|season\s+\d)/i,
  /\b(release|releases|releasing)\s+date\s+(for|announced|revealed|set)\b/i,

  // Weather, horoscope, obituary
  /^(horoscope|obituary|weather forecast|today's\s+horoscope)/i,

  // Sport recaps — live feeds
  /\bvs\.?\s+[A-Z][a-z]+:\s*(live|how|what)/i,

  // Heavy content: sexual assault, rape, CSA — applies to REAL and FAKE
  // headlines alike. Never playable, regardless of framing.
  /\bsexual\s+(assault|abuse|misconduct|harass(ment)?|battery|violence)/i,
  /\b(rape|raped|rapist|rapes?)\b/i,
  /\ballegations?\s+of\s+(sexual|rape|abuse|assault)/i,
  /\b(child|minor|underage)\s+(sex|sexual|abuse|porn|exploitation|trafficking)/i,
  /\b(molest|pedophile|pedo|incest|statutory\s+rape)/i,
  /\b(killing|murder)\s+of\s+(a\s+)?(child|infant|baby|toddler|minor)\b/i,

  // Mass-casualty and shooting events — also not playable
  /\b(mass\s+shooting|school\s+shooting|opens?\s+fire|gunman|active\s+shooter|drive[- ]by\s+shoot)/i,
  /\b(stampede|massacre|genocide|ethnic\s+cleansing)\b/i,
  /\b(suicide\s+bomb|car\s+bomb|ied\s+explosion|terror\s+attack|terrorist\s+attack)\b/i,
  /\b(deadly)\s+(crash|fire|attack|strike|blast|explosion|accident|bombing|stampede|collapse)\b/i,

  // Trump / current president — too obvious for fill-in-the-blank
  /\btrump\b/i,

  // Celebrity death / obituary — too obviously real, no guessing value
  /\bdies\s+at\s+\d+/i,
  /\bdied\s+at\s+(age\s+)?\d+/i,
  /\bdead\s+at\s+\d+/i,
  /\bpasses\s+away\b/i,
  /\bhas\s+died\b/i,
  /\bfound\s+dead\b/i,
  /\b(rip|rest\s+in\s+peace)\b/i,
  /\b(mourns?|mourning)\s+(the\s+)?(death|loss|passing)\s+of\b/i,
  /\bcause\s+of\s+death\b/i,
  /\bobituary\b/i,

  // Active armed conflict content
  /\b(gaza|lebanon|west\s+bank|ukraine|kyiv|donbas|mariupol|crimea|donetsk|luhansk)\b/i,
  /\b(israeli?\s+strikes?|airstrike|air\s+strike|missile\s+strike|drone\s+strike|rocket\s+attack|cease[- ]?fire|ceasefire|war\s+crimes?|idf|hamas|hezbollah|houthi)\b/i,
  /\b(killed|wounded|dead|injured)\s+in\s+(airstrike|strike|bombing|attack|raid|clash(es)?)\b/i,
];

const BAD_SUBSTRINGS: string[] = [
  "medium.com",
  "substack",
  "[sponsored]",
  "[video]",
];

// Event-verb allowlist. A playable headline should describe something
// happening — a verb somewhere. If NONE of these words appear, the headline
// is probably a listicle header, a profile piece, a label, or a noun phrase
// ("Unusual Stories From the Mighty Mac Bridge", "Best Coachella Outfits 2026").
const EVENT_VERBS: Set<string> = new Set([
  // Past-tense
  "accused","admitted","announced","approved","arrested","attacked","backed",
  "banned","blamed","blasted","bought","broke","brought","built","burned",
  "called","came","captured","caught","charged","chased","cheated","cheered",
  "chose","claimed","cleared","closed","collapsed","confirmed","confronted",
  "crashed","created","crossed","cut","damaged","danced","dashed","declared",
  "defeated","defended","demanded","denied","destroyed","detained","died",
  "disappeared","discovered","dismissed","divorced","dodged","drew","drove",
  "dropped","earned","elected","emerged","ended","escaped","estimated","evacuated",
  "faced","faked","fell","filmed","fired","fled","flew","fought","found",
  "founded","frozen","funded","gave","gained","got","grabbed","halted","handed",
  "hit","hired","hijacked","hosted","hurt","ignited","ignored","injured",
  "installed","invaded","invited","issued","joined","jumped","kicked","killed",
  "landed","laughed","launched","leaked","led","left","lied","lifted","lit",
  "lost","made","married","met","missed","mocked","moved","named","noticed",
  "offered","opened","ordered","paid","passed","pelted","performed","picked",
  "planted","played","pleaded","plunged","pointed","posted","praised","pressed",
  "promised","prompted","protested","proved","published","pulled","punched",
  "pushed","quit","raced","raided","raised","reached","rebuilt","received",
  "recovered","refused","rejected","released","removed","repaired","replaced",
  "reported","rescued","resigned","responded","returned","revealed","robbed",
  "rolled","ruled","rushed","said","sang","sank","saved","scored","screamed",
  "searched","seized","sentenced","separated","served","set","settled","shared",
  "shattered","shipped","shook","shot","showed","shut","signed","slammed",
  "slapped","slipped","smashed","sneaked","sold","sought","sparked","spoke",
  "sprayed","stabbed","stalled","started","stole","stopped","stormed","struck",
  "stunned","sued","suffered","surrendered","survived","swam","swung","took",
  "toppled","tore","torched","tossed","tracked","trapped","tried","triggered",
  "turned","uncovered","unveiled","urged","used","vandalized","vanished","voted",
  "walked","warned","watched","wept","wielded","won","wounded","wrecked","wrote",

  // Present-tense news verbs — removed noun-prone dual-use words like
  // "shows","hits","faces","takes","offers","wins","cuts","backs","breaks","cares"
  "accuses","admits","announces","approves","arrests","attacks","bans","blames",
  "blasts","buys","brings","builds","burns","captures","catches","charges",
  "cheats","claims","clears","confirms","crashes","damages","declares","defends",
  "defies","demands","denies","destroys","detains","dies","disappears","dismisses",
  "dodges","drives","earns","ejects","elects","emerges","escapes","evacuates",
  "falls","fights","fires","flees","flies","frees","funds","grabs","halts","hires",
  "ignites","injures","installs","invades","invites","issues","joins","jumps",
  "kicks","kills","lands","launches","leaks","lifts","loses","marries","meets",
  "misses","mocks","opens","orders","overturns","owes","pays","pleads","plunges",
  "posts","praises","presses","promises","prompts","protests","pulls","punches",
  "pushes","quits","raids","raises","receives","refuses","rejects","releases",
  "removes","repairs","replaces","rescues","resigns","responds","reveals","robs",
  "rules","saves","says","scolds","seizes","sentences","serves","settles",
  "shatters","ships","shoots","signs","slams","sneaks","sparks","starts","steals",
  "stops","storms","strikes","stuns","sues","suffers","surrenders","survives",
  "sweeps","tells","threatens","topples","torches","tosses","tracks","traps",
  "tries","triggers","uncovers","unveils","urges","vanishes","votes","walks",
  "warns","watches","welcomes","wields","wounds","wrecks","writes",

  // Short-form / irregular (kept only the unambiguous verbs — removed
  // noun-prone words like "shows","wins","hits","faces","takes","offers")
  "grew","seeks","gets","saw","ran","flew","shot","put","spent","beat","beaten",
  "began","begun","sank","lit","rode","rose","rang","bit","bitten","felt","led",
  "stuck","spotted",

  // Occupational/ongoing actions common in headlines
  "indicted","sued","suing","chasing","fleeing","suing","pleading",
  "searching","facing","seeking","threatening","challenging","launching",
  "planning","expanding","building","closing","cutting","firing","raising",
  "demanding","blocking","protesting","marching","rejecting","approving",
]);

function hasEventShape(headline: string): boolean {
  // Tokenize into lowercase words, strip punctuation
  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const tok of tokens) {
    if (EVENT_VERBS.has(tok)) return true;
  }
  return false;
}

export function isLowQualityHeadline(headline: string): boolean {
  const h = headline.trim();
  if (h.length < 25) return true;
  // Minimum word count — headlines under 5 words are too vague to evaluate
  if (h.split(/\s+/).filter(Boolean).length < 5) return true;
  // Upper bound keeps headlines legible on the newspaper component
  if (h.length > 120) return true;

  // Must contain at least one word character outside of all-caps initialisms
  const letters = h.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 10) return true;

  for (const re of BAD_PATTERNS) {
    if (re.test(h)) return true;
  }
  const lower = h.toLowerCase();
  for (const s of BAD_SUBSTRINGS) {
    if (lower.includes(s)) return true;
  }

  // Must read as "something happened" — at least one event-indicating verb.
  // Catches listicle/profile/label headlines that escape the pattern list.
  if (!hasEventShape(h)) return true;

  return false;
}
