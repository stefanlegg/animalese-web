/** Number of letter samples in the WAV library (A-Z). */
export const LETTER_COUNT = 26;

/** Duration of each letter in the sample library, in seconds. */
export const LIBRARY_LETTER_DURATION = 0.15;

/** Default output duration per letter, in seconds. */
export const DEFAULT_LETTER_DURATION = 0.075;

/** Default base pitch multiplier. */
export const DEFAULT_BASE_PITCH = 1.0;

/** Default random pitch variation range. */
export const DEFAULT_PITCH_RANGE = 0.25;

/** Default volume. */
export const DEFAULT_VOLUME = 1.0;

/** Lookahead scheduler interval in milliseconds. */
export const LOOKAHEAD_MS = 25;

/** How far ahead to schedule audio, in seconds. */
export const SCHEDULE_AHEAD_TIME = 0.1;

/** ASCII code for 'A'. */
export const CHAR_CODE_A = 65;

/** ASCII code for 'Z'. */
export const CHAR_CODE_Z = 90;
