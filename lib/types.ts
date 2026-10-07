export type NormalRound = {
  kind: "normal";
  id: string;
  headline: string;
  isReal: boolean;
  source?: string;
  revealText: string;
};

export type BonusChoice = {
  id: string; // headlines.id of this specific choice — used for answer tracking
  headline: string;
  isReal: boolean;
  source?: string;
  revealText: string;
};

export type BonusRound = {
  kind: "bonus";
  id: string;
  subject: string;
  choices: BonusChoice[]; // length 3, exactly one isReal = true
};

export type BlankRound = {
  kind: "blank";
  id: string;
  template: string;          // the headline with "_____" where the name was
  answer: string;            // the correct name
  choices: string[];         // shuffled: contains answer + 2 distractors
  originalHeadline: string;  // full real headline (shown on reveal)
  revealText: string;
  source?: string;
};

export type Round = NormalRound | BonusRound | BlankRound;

export const POINTS_NORMAL = 5;
export const POINTS_BONUS = 10;
// Each bonus track (pick-real bonus + fill-the-blank) runs its own
// independent countdown within this range. Adjacent bonuses are possible
// when timers happen to align.
export const BONUS_MIN_GAP = 3;
export const BONUS_MAX_GAP = 8;

export type Score = {
  initials: string;
  streak: number;
  score: number;
  at: number;
};

export type HeadlinesResponse = { rounds: Round[] };
export type ScoresResponse = { scores: Score[] };
