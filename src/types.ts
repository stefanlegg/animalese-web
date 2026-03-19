/** Configuration for the Animalese synthesizer. */
export interface AnimaleseConfig {
  /** Base pitch multiplier. 1.0 = original, >1 = higher, <1 = lower. Default: 1.0 */
  basePitch?: number;

  /** Random pitch variation range applied per letter (e.g. 0.25 means +/- 0.125). Default: 0.25 */
  pitchRange?: number;

  /** Duration of each letter in seconds. Default: 0.075 */
  letterDuration?: number;

  /** Shorten words to first letter only (AC style). Default: false */
  shortenWords?: boolean;

  /** Volume 0.0 to 1.0. Default: 1.0 */
  volume?: number;

  /** Audio node to connect output to. Defaults to ctx.destination. */
  destination?: AudioNode;
}

/** A letter scheduled for playback. */
export interface ScheduledLetter {
  /** The character from the original input string. */
  char: string;

  /** Index in the original input string. */
  index: number;

  /** Scheduled audio time (AudioContext.currentTime). */
  time: number;

  /** Whether this produces silence (space/punctuation). */
  isSilent: boolean;
}

/** Callback fired for each letter as it plays. */
export type OnLetterCallback = (letter: ScheduledLetter) => void;

/** Callback fired when speech completes naturally. */
export type OnCompleteCallback = () => void;

/** Options for a single speak() call. */
export interface SpeakOptions {
  /** Fired when each letter starts playing. Primary hook for typewriter sync. */
  onLetter?: OnLetterCallback;

  /** Fired when speech finishes naturally. */
  onComplete?: OnCompleteCallback;

  /** Per-call overrides. */
  basePitch?: number;
  pitchRange?: number;
  letterDuration?: number;
  shortenWords?: boolean;
  volume?: number;
}

/** Handle to control an active speech. */
export interface SpeechHandle {
  /** Stop playback immediately. Cannot be resumed. */
  stop(): void;

  /** Pause playback. Position is saved for resume. */
  pause(): void;

  /** Resume playback after pause. */
  resume(): void;

  /** Promise that resolves when speech finishes naturally (not on stop). */
  readonly finished: Promise<void>;

  /** Current playback state. */
  readonly state: "playing" | "paused" | "stopped" | "finished";
}
