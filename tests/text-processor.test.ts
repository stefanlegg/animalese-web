import { describe, it, expect } from "vitest";
import { processText } from "../src/text-processor";

describe("processText", () => {
  describe("normal mode (shorten = false)", () => {
    it("maps A-Z letters to indices 0-25", () => {
      const result = processText("ABC", false);
      expect(result).toEqual([
        { char: "A", originalIndex: 0, letterIndex: 0 },
        { char: "B", originalIndex: 1, letterIndex: 1 },
        { char: "C", originalIndex: 2, letterIndex: 2 },
      ]);
    });

    it("maps lowercase to uppercase with correct indices", () => {
      const result = processText("abc", false);
      expect(result).toEqual([
        { char: "A", originalIndex: 0, letterIndex: 0 },
        { char: "B", originalIndex: 1, letterIndex: 1 },
        { char: "C", originalIndex: 2, letterIndex: 2 },
      ]);
    });

    it("maps Z to index 25", () => {
      const result = processText("Z", false);
      expect(result).toEqual([
        { char: "Z", originalIndex: 0, letterIndex: 25 },
      ]);
    });

    it("maps spaces to silence (letterIndex -1)", () => {
      const result = processText("A B", false);
      expect(result).toEqual([
        { char: "A", originalIndex: 0, letterIndex: 0 },
        { char: " ", originalIndex: 1, letterIndex: -1 },
        { char: "B", originalIndex: 2, letterIndex: 1 },
      ]);
    });

    it("maps punctuation to silence", () => {
      const result = processText("Hi!", false);
      expect(result).toEqual([
        { char: "H", originalIndex: 0, letterIndex: 7 },
        { char: "I", originalIndex: 1, letterIndex: 8 },
        { char: "!", originalIndex: 2, letterIndex: -1 },
      ]);
    });

    it("maps numbers to silence", () => {
      const result = processText("A1B", false);
      expect(result[1]).toEqual({
        char: "1",
        originalIndex: 1,
        letterIndex: -1,
      });
    });

    it("returns empty array for empty string", () => {
      expect(processText("", false)).toEqual([]);
    });

    it("preserves original indices for every character", () => {
      const text = "Hello World";
      const result = processText(text, false);
      expect(result.length).toBe(text.length);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].originalIndex).toBe(i);
      }
    });
  });

  describe("shorten mode (shorten = true)", () => {
    it("reduces words to first letter only", () => {
      const result = processText("Hello", true);
      expect(result).toEqual([
        { char: "H", originalIndex: 0, letterIndex: 7 },
      ]);
    });

    it("preserves spaces as silence between words", () => {
      const result = processText("Hi There", true);
      expect(result).toEqual([
        { char: "H", originalIndex: 0, letterIndex: 7 },
        { char: " ", originalIndex: 2, letterIndex: -1 },
        { char: "T", originalIndex: 3, letterIndex: 19 },
      ]);
    });

    it("handles multiple words", () => {
      const result = processText("One Two Three", true);
      expect(result.filter((c) => c.letterIndex >= 0).length).toBe(3);
      expect(result.filter((c) => c.letterIndex >= 0).map((c) => c.char)).toEqual([
        "O",
        "T",
        "T",
      ]);
    });

    it("maps first letter of word starting with punctuation to silence", () => {
      const result = processText("!hey", true);
      // First char is "!", which maps to silence
      expect(result[0].letterIndex).toBe(-1);
    });

    it("returns empty array for empty string", () => {
      expect(processText("", true)).toEqual([]);
    });

    it("handles single character words", () => {
      const result = processText("I am A cat", true);
      const letters = result.filter((c) => c.letterIndex >= 0);
      expect(letters.map((c) => c.char)).toEqual(["I", "A", "A", "C"]);
    });
  });
});
