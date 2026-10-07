import { describe, expect, it } from "vitest";
import { normalizeName, validateDisplayName } from "@/lib/auth/validateDisplayName";

const reason = (name: string) => {
  const r = validateDisplayName(name);
  return r.ok ? null : r.reason;
};

// Escapes keep look-alike and invisible characters visible in the source.
const CYRILLIC_A = "а";
const CYRILLIC_ER_UPPER = "Р";
const CYRILLIC_O = "о";
const GREEK_OMICRON = "ο";
const ZERO_WIDTH_SPACE = "​";
const RTL_OVERRIDE = "‮";

describe("validateDisplayName", () => {
  it("accepts a normal name and returns it trimmed but otherwise as typed", () => {
    expect(validateDisplayName("  Penny_Lane-42 ")).toEqual({ ok: true, value: "Penny_Lane-42" });
    expect(validateDisplayName("Zoë K.")).toEqual({ ok: true, value: "Zoë K." });
  });

  it("enforces 3-20 characters after trimming", () => {
    expect(reason("  ab  ")).toMatch(/at least 3/);
    expect(reason("a".repeat(21))).toMatch(/20 characters or fewer/);
    expect(reason("a".repeat(20))).toBeNull();
  });

  it("rejects disallowed characters, invisible characters and repeated spaces", () => {
    expect(reason("penny@lane")).toMatch(/letters, numbers/);
    expect(reason(`mo${ZERO_WIDTH_SPACE}d`)).toMatch(/letters, numbers/);
    expect(reason("penny  lane")).toMatch(/one space/);
  });

  it("blocks reserved names even when disguised with separators or case", () => {
    expect(reason("Admin")).toMatch(/reserved/);
    expect(reason("real_or-fake")).toMatch(/reserved/);
  });

  it("blocks reserved names spelled with Cyrillic or Greek look-alike letters", () => {
    expect(reason(`${CYRILLIC_A}dmin`)).toMatch(/reserved/);
    expect(reason(`r${GREEK_OMICRON}${GREEK_OMICRON}t`)).toMatch(/reserved/);
  });

  it("blocks profanity hidden behind punctuation", () => {
    expect(reason("sh.it_happens")).toMatch(/isn't allowed/);
  });
});

describe("normalizeName", () => {
  it("folds diacritics, homoglyphs and invisible characters to lowercase ASCII", () => {
    expect(normalizeName(`Zoë${ZERO_WIDTH_SPACE}`)).toBe("zoe");
    expect(normalizeName(`${CYRILLIC_ER_UPPER}${CYRILLIC_O}${CYRILLIC_O}t`)).toBe("poot");
    expect(normalizeName(`Café${RTL_OVERRIDE}`)).toBe("cafe");
  });
});
