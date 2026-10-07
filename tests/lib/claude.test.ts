import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

import { generateBlankRounds, generateBonusSet, generateFakes } from "@/lib/headlines/claude";

type Block = { type: string; text?: string };
const reply = (...blocks: Block[]) => create.mockResolvedValueOnce({ content: blocks });
const text = (t: string): Block => ({ type: "text", text: t });

type CreateArgs = { system: string; messages: { content: string }[] };
const lastCall = () => create.mock.calls.at(-1)![0] as CreateArgs;

beforeEach(() => {
  create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("generateFakes", () => {
  it("refuses to run without an API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(generateFakes(["x"], 1, "plausible")).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(create).not.toHaveBeenCalled();
  });

  it("extracts JSON from prose split across text blocks, trims fields and drops incomplete fakes", async () => {
    reply(
      { type: "thinking" },
      text('Here you go:\n{"fakes": [{"headline": "  Goat elected honorary fire chief  ", '),
      text('"revealText": " Fake. "}, {"headline": "No reveal text"}, {"revealText": "No headline"}]}\nEnjoy!'),
    );
    await expect(generateFakes(["ref"], 3, "edgy")).resolves.toEqual([
      { headline: "Goat elected honorary fire chief", reveal_text: "Fake.", tone: "edgy" },
    ]);
  });

  it("returns an empty list when the model does not answer with valid JSON", async () => {
    reply(text("Sorry, I can't help with that."));
    await expect(generateFakes(["ref"], 3, "plausible")).resolves.toEqual([]);
    reply(text('{"fakes": [ {"headline": "unterminated" '));
    await expect(generateFakes(["ref"], 3, "plausible")).resolves.toEqual([]);
  });

  it("picks the prompt by tone and sends at most 30 numbered reference headlines", async () => {
    const refs = Array.from({ length: 40 }, (_, i) => `Reference headline ${i + 1}`);
    reply(text('{"fakes": []}'));
    await generateFakes(refs, 7, "edgy");
    const edgy = lastCall();
    expect(edgy.system).toMatch(/weird-news register/);
    expect(edgy.messages[0].content).toContain("30. Reference headline 30");
    expect(edgy.messages[0].content).not.toContain("Reference headline 31");
    expect(edgy.messages[0].content).toContain("Generate exactly 7 fake headlines");

    reply(text('{"fakes": []}'));
    await generateFakes(refs, 7, "plausible");
    expect(lastCall().system).not.toMatch(/weird-news register/);
  });
});

describe("generateBlankRounds", () => {
  it("does not call the API for an empty headline list", async () => {
    await expect(generateBlankRounds([], 5)).resolves.toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });

  it("numbers the input from 0 and keeps only rounds with an index, template, answer, two distractors and reveal", async () => {
    reply(
      text(
        JSON.stringify({
          rounds: [
            { fromIndex: 1, template: " _____ adopted a goat ", answer: " Pat Example ", distractors: [" Sam Sample", "Alex Placeholder "], revealText: " Real. " },
            { fromIndex: "0", template: "t", answer: "a", distractors: ["b", "c"], revealText: "r" },
            { fromIndex: 0, template: "t", answer: "a", distractors: ["b"], revealText: "r" },
            { fromIndex: 0, template: "t", answer: "a", distractors: ["b", "c"] },
          ],
        }),
      ),
    );
    const out = await generateBlankRounds(["First headline", "Pat Example adopted a goat"], 5);
    expect(lastCall().messages[0].content).toContain("0. First headline\n1. Pat Example adopted a goat");
    expect(out).toEqual([
      { fromIndex: 1, template: "_____ adopted a goat", answer: "Pat Example", distractors: ["Sam Sample", "Alex Placeholder"], reveal_text: "Real." },
    ]);
  });
});

describe("generateBonusSet", () => {
  it("returns the trimmed subject and fakes", async () => {
    reply(text('{"subject": " Octopus Antics ", "fakes": [{"headline": "A", "revealText": "x"}, {"headline": "B", "revealText": "y"}]}'));
    await expect(generateBonusSet("Aquarium octopus escaped through drainpipe")).resolves.toEqual({
      subject: "Octopus Antics",
      fakes: [
        { headline: "A", reveal_text: "x" },
        { headline: "B", reveal_text: "y" },
      ],
    });
    expect(lastCall().messages[0].content).toContain('"Aquarium octopus escaped through drainpipe"');
  });

  it("returns null when there is no subject or fewer than two usable fakes", async () => {
    reply(text('{"fakes": [{"headline": "A", "revealText": "x"}, {"headline": "B", "revealText": "y"}]}'));
    await expect(generateBonusSet("real")).resolves.toBeNull();
    reply(text('{"subject": "S", "fakes": [{"headline": "A", "revealText": "x"}, {"headline": "B"}]}'));
    await expect(generateBonusSet("real")).resolves.toBeNull();
  });
});
