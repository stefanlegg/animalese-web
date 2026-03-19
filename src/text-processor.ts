import { CHAR_CODE_A, CHAR_CODE_Z } from "./constants";

/** A processed character ready for playback scheduling. */
export interface ProcessedChar {
  /** The character from the processed (possibly shortened) text. */
  char: string;

  /** Index in the original input string this character maps to. */
  originalIndex: number;

  /** 0-25 for A-Z, -1 for silence (space/punctuation). */
  letterIndex: number;
}

/**
 * Shortens a word to its first letter only (Animal Crossing style).
 * "Hello" → "H", "OK" → "O"
 */
function shortenWord(word: string): string {
  return word.length > 0 ? word[0] : "";
}

/**
 * Process input text into a sequence of characters with letter indices.
 *
 * When shortenWords is true, each word is reduced to its first letter,
 * mimicking how Animal Crossing shortens dialogue for animalese playback.
 *
 * Returns ProcessedChar entries that map back to the original text indices,
 * so the onLetter callback can reference the correct position in the
 * original string for typewriter display.
 */
export function processText(
  text: string,
  shorten: boolean,
): ProcessedChar[] {
  const result: ProcessedChar[] = [];

  if (shorten) {
    // Split into words, shorten each, track original indices
    const words = text.split(/(\s+)/);
    let originalOffset = 0;

    for (const segment of words) {
      if (/^\s+$/.test(segment)) {
        // Whitespace — emit a single silence mapped to first space char
        result.push({
          char: " ",
          originalIndex: originalOffset,
          letterIndex: -1,
        });
      } else if (segment.length > 0) {
        // Word — take first letter only
        const ch = segment[0].toUpperCase();
        const code = ch.charCodeAt(0);
        result.push({
          char: ch,
          originalIndex: originalOffset,
          letterIndex:
            code >= CHAR_CODE_A && code <= CHAR_CODE_Z ? code - CHAR_CODE_A : -1,
        });
      }
      originalOffset += segment.length;
    }
  } else {
    // Process every character, map each to original index
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toUpperCase();
      const code = ch.charCodeAt(0);
      result.push({
        char: ch,
        originalIndex: i,
        letterIndex:
          code >= CHAR_CODE_A && code <= CHAR_CODE_Z ? code - CHAR_CODE_A : -1,
      });
    }
  }

  return result;
}
