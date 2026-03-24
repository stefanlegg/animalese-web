import { describe, it, expect } from "vitest";
import {
  LETTER_COUNT,
  LIBRARY_LETTER_DURATION,
  DEFAULT_LETTER_DURATION,
  DEFAULT_BASE_PITCH,
  DEFAULT_PITCH_RANGE,
  DEFAULT_VOLUME,
  LOOKAHEAD_MS,
  SCHEDULE_AHEAD_TIME,
  CHAR_CODE_A,
  CHAR_CODE_Z,
} from "../src/constants";

describe("constants", () => {
  it("has 26 letters", () => {
    expect(LETTER_COUNT).toBe(26);
  });

  it("library letter duration is 150ms", () => {
    expect(LIBRARY_LETTER_DURATION).toBe(0.15);
  });

  it("default letter duration is shorter than library duration", () => {
    expect(DEFAULT_LETTER_DURATION).toBeLessThan(LIBRARY_LETTER_DURATION);
  });

  it("default pitch is 1.0 (unmodified)", () => {
    expect(DEFAULT_BASE_PITCH).toBe(1.0);
  });

  it("default volume is 1.0 (full)", () => {
    expect(DEFAULT_VOLUME).toBe(1.0);
  });

  it("default pitch range is positive", () => {
    expect(DEFAULT_PITCH_RANGE).toBeGreaterThan(0);
  });

  it("schedule ahead time is longer than lookahead interval", () => {
    expect(SCHEDULE_AHEAD_TIME * 1000).toBeGreaterThan(LOOKAHEAD_MS);
  });

  it("char codes span A-Z", () => {
    expect(CHAR_CODE_A).toBe(65);
    expect(CHAR_CODE_Z).toBe(90);
    expect(CHAR_CODE_Z - CHAR_CODE_A + 1).toBe(LETTER_COUNT);
  });
});
