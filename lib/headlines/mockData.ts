import type { BlankRound, BonusRound, NormalRound, Round } from "@/lib/types";
import { BONUS_MAX_GAP, BONUS_MIN_GAP } from "@/lib/types";

export const mockNormalRounds: NormalRound[] = [
  {
    kind: "normal",
    id: "m1",
    headline: "SpaceX Successfully Launches 23 Starlink Satellites From Florida",
    isReal: true,
    source: "https://www.spacex.com/launches",
    revealText: "Real — a routine Falcon 9 Starlink batch launch from Cape Canaveral.",
  },
  {
    kind: "normal",
    id: "m2",
    headline: "Florida Man Arrested After Trying To Pay For Groceries With Live Iguana",
    isReal: false,
    revealText:
      "Fake. The real story: a Florida man was arrested for throwing an iguana at a restaurant patron — no groceries involved.",
  },
  {
    kind: "normal",
    id: "m3",
    headline: "Japan Unveils Train That Apologizes To Passengers If It Arrives Early",
    isReal: false,
    revealText:
      "Fake. JR West did once issue a public apology when a train left 20 seconds early — but there is no apologizing train.",
  },
  {
    kind: "normal",
    id: "m4",
    headline: "World Health Organization Declares Loneliness A Global Health Threat",
    isReal: true,
    source: "https://www.who.int/",
    revealText: "Real — the WHO launched a commission on social connection citing loneliness as a pressing threat.",
  },
  {
    kind: "normal",
    id: "m5",
    headline: "Scientists Discover Octopuses Dream In Color Despite Being Colorblind",
    isReal: false,
    revealText:
      "Fake. Octopuses change color while sleeping, and researchers suspect they may dream, but color dreaming has not been shown.",
  },
  {
    kind: "normal",
    id: "m6",
    headline: "IKEA Recalls Meatballs After Discovery They Contain Trace Amounts Of Wood",
    isReal: false,
    revealText:
      "Fake. IKEA has recalled meatballs before (horsemeat in 2013), but not for wood contamination.",
  },
  {
    kind: "normal",
    id: "m7",
    headline: "Finland Ranked World's Happiest Country For Seventh Consecutive Year",
    isReal: true,
    source: "https://worldhappiness.report/",
    revealText: "Real — the World Happiness Report has placed Finland at #1 every year since 2018.",
  },
  {
    kind: "normal",
    id: "m8",
    headline: "Amazon Launches Drone Delivery Service Exclusively For Pet Food",
    isReal: false,
    revealText:
      "Fake. Amazon Prime Air does deliver via drones in select cities, but not pet-food exclusive.",
  },
];

export const mockBonusRounds: BonusRound[] = [
  {
    kind: "bonus",
    id: "b1",
    subject: "Aquarium Octopus Antics",
    choices: [
      {
        id: "b1-a",
        headline:
          "New Zealand Aquarium Octopus Escapes Tank, Slides Down Drainpipe Back To Ocean",
        isReal: true,
        source:
          "https://www.theguardian.com/world/2016/apr/13/inky-the-octopus-escapes-new-zealand-aquarium",
        revealText:
          "Real — 'Inky' famously escaped the National Aquarium of New Zealand in 2016 by squeezing through a drain pipe that led to the sea.",
      },
      {
        id: "b1-b",
        headline:
          "Seattle Aquarium Octopus Repeatedly Caught Sneaking Into Neighboring Tank To Eat The Sharks' Dinner",
        isReal: false,
        revealText:
          "Fake. Octopuses have raided nearby tanks in isolated incidents, but no Seattle shark-dinner thief has been documented.",
      },
      {
        id: "b1-c",
        headline:
          "Boston Aquarium Octopus Learns To Unscrew Jar Lid From Inside Tank, Escapes Into Filtration System Overnight",
        isReal: false,
        revealText:
          "Fake. Octopuses can unscrew jars from the outside — the inside-jar filtration escape is an invention.",
      },
    ],
  },
  {
    kind: "bonus",
    id: "b2",
    subject: "Florida Man",
    choices: [
      {
        id: "b2-a",
        headline:
          "Florida Man Arrested After Throwing Live Alligator Through Wendy's Drive-Thru Window",
        isReal: true,
        source: "https://www.npr.org/sections/thetwo-way/2016/02/09/466209924",
        revealText:
          "Real — James Francis Wiseman pled no contest in 2016 after hurling a 3.5-foot gator through a Wendy's drive-thru.",
      },
      {
        id: "b2-b",
        headline:
          "Florida Man Cited For Riding Manatee Down Tampa Highway During Rush Hour Commute",
        isReal: false,
        revealText:
          "Fake. Manatee harassment charges are real and common in Florida, but no highway joyride has been documented.",
      },
      {
        id: "b2-c",
        headline:
          "Florida Man Discovers Pirate Treasure While Metal Detecting, Uses It To Pay Off Back Child Support",
        isReal: false,
        revealText:
          "Fake. Treasure finds happen on Florida beaches, but none have been reported as child-support payoffs.",
      },
    ],
  },
];

export function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random integer in [min, max] inclusive. */
function randGap() {
  return (
    BONUS_MIN_GAP +
    Math.floor(Math.random() * (BONUS_MAX_GAP - BONUS_MIN_GAP + 1))
  );
}

/**
 * Build a playable sequence with two independent bonus tracks:
 *   - bonuses (pick-the-real) — fires every 3-8 normals
 *   - blanks  (fill-in-the-name) — fires every 3-8 normals
 * Tracks are independent, so a blank and a bonus can land in adjacent slots
 * when timers happen to align. Stops when the normal pool empties; any
 * remaining bonus/blank items get appended at the end.
 */
export function buildRoundSequence(
  normals: NormalRound[],
  bonuses: BonusRound[],
  blanks: BlankRound[] = []
): Round[] {
  const seq: Round[] = [];
  const n = [...normals];
  const b = [...bonuses];
  const k = [...blanks];
  let untilBonus = randGap();
  let untilBlank = randGap();

  // Hard rule: the first 3 normal rounds must contain at least 1 real AND
  // at least 1 fake. So either 2 real + 1 fake or 1 real + 2 fake.
  // We enforce this by pre-placing the first 3 normals with a guaranteed mix,
  // then continuing with the normal interleave logic for the rest.
  const reals = n.filter((r) => r.isReal);
  const fakes = n.filter((r) => !r.isReal);
  const firstThree: NormalRound[] = [];

  if (reals.length >= 2 && fakes.length >= 1) {
    // 2 real + 1 fake (or 1 real + 2 fake chosen randomly)
    if (fakes.length >= 2 && Math.random() < 0.5) {
      firstThree.push(fakes.shift()!, fakes.shift()!, reals.shift()!);
    } else {
      firstThree.push(reals.shift()!, reals.shift()!, fakes.shift()!);
    }
  } else if (reals.length >= 1 && fakes.length >= 2) {
    firstThree.push(fakes.shift()!, fakes.shift()!, reals.shift()!);
  } else if (reals.length >= 1 && fakes.length >= 1) {
    firstThree.push(reals.shift()!, fakes.shift()!);
    if (reals.length > 0) firstThree.push(reals.shift()!);
    else if (fakes.length > 0) firstThree.push(fakes.shift()!);
  }
  // Shuffle the first three so the order isn't predictable
  const shuffledFirst = shuffled(firstThree);
  // Rebuild n from remaining reals + fakes
  n.length = 0;
  n.push(...shuffled([...reals, ...fakes]));

  // Place the guaranteed first 3 normal rounds
  for (const r of shuffledFirst) {
    seq.push(r);
  }

  // Round 4 is ALWAYS a bonus (pick-real or fill-blank, chosen randomly).
  // This guarantees players see a bonus early in every game.
  if (b.length > 0 && k.length > 0) {
    seq.push(Math.random() < 0.5 ? b.shift()! : k.shift()!);
  } else if (b.length > 0) {
    seq.push(b.shift()!);
  } else if (k.length > 0) {
    seq.push(k.shift()!);
  }

  // Reset cadences after the guaranteed round-4 bonus
  untilBonus = randGap();
  untilBlank = randGap();

  while (n.length > 0) {
    // If either track is due AND has an item, fire it. If both are due,
    // fire bonus first; the blank will fire on the next iteration since its
    // timer is still at 0.
    if (untilBonus === 0 && b.length > 0) {
      seq.push(b.shift()!);
      untilBonus = randGap();
      continue;
    }
    if (untilBlank === 0 && k.length > 0) {
      seq.push(k.shift()!);
      untilBlank = randGap();
      continue;
    }
    // Otherwise consume a normal and tick both countdowns.
    seq.push(n.shift()!);
    if (untilBonus > 0) untilBonus -= 1;
    if (untilBlank > 0) untilBlank -= 1;
  }
  // Flush any remaining bonus / blank items so nothing is wasted.
  while (b.length > 0) seq.push(b.shift()!);
  while (k.length > 0) seq.push(k.shift()!);
  return seq;
}
