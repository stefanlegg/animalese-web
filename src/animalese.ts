import {
  DEFAULT_BASE_PITCH,
  DEFAULT_LETTER_DURATION,
  DEFAULT_PITCH_RANGE,
  DEFAULT_VOLUME,
} from "./constants";
import { loadAudioBuffer, sliceLetterSamples } from "./sample-slicer";
import {
  createSchedulerState,
  startCallbackLoop,
  startSchedulerLoop,
  stopScheduler,
  type SchedulerState,
} from "./scheduler";
import { processText } from "./text-processor";
import type { AnimaleseConfig, SpeakOptions, SpeechHandle } from "./types";

interface ResolvedConfig {
  basePitch: number;
  pitchRange: number;
  letterDuration: number;
  shortenWords: boolean;
  volume: number;
}

function resolveConfig(
  base: ResolvedConfig,
  overrides?: Partial<ResolvedConfig>,
): ResolvedConfig {
  if (!overrides) return base;
  return {
    basePitch: overrides.basePitch ?? base.basePitch,
    pitchRange: overrides.pitchRange ?? base.pitchRange,
    letterDuration: overrides.letterDuration ?? base.letterDuration,
    shortenWords: overrides.shortenWords ?? base.shortenWords,
    volume: overrides.volume ?? base.volume,
  };
}

export class Animalese {
  private ctx: AudioContext;
  private config: ResolvedConfig;
  private destination: AudioNode;
  private letterBuffers: AudioBuffer[] | null = null;

  /**
   * Create an Animalese synthesizer.
   *
   * @param ctx - An AudioContext. Caller owns this and handles autoplay policy
   *              (call ctx.resume() on user gesture before speaking).
   * @param config - Default configuration, overridable per speak() call.
   */
  constructor(ctx: AudioContext, config?: AnimaleseConfig) {
    this.ctx = ctx;
    this.destination = config?.destination ?? ctx.destination;
    this.config = {
      basePitch: config?.basePitch ?? DEFAULT_BASE_PITCH,
      pitchRange: config?.pitchRange ?? DEFAULT_PITCH_RANGE,
      letterDuration: config?.letterDuration ?? DEFAULT_LETTER_DURATION,
      shortenWords: config?.shortenWords ?? false,
      volume: config?.volume ?? DEFAULT_VOLUME,
    };
  }

  /**
   * Whether the sample library has been loaded and the instance is ready to speak.
   */
  get isLoaded(): boolean {
    return this.letterBuffers !== null;
  }

  /**
   * Release the decoded sample buffers from memory.
   * After calling dispose(), load() must be called again before speaking.
   */
  dispose(): void {
    this.letterBuffers = null;
  }

  /**
   * Load and decode the letter samples WAV file.
   * Must be called once before speak(). Idempotent — subsequent calls
   * reload and re-slice the samples.
   *
   * @param source - URL string, ArrayBuffer, or fetch Response of the WAV file.
   */
  async load(source: string | ArrayBuffer | Response): Promise<void> {
    const masterBuffer = await loadAudioBuffer(this.ctx, source);
    this.letterBuffers = sliceLetterSamples(this.ctx, masterBuffer);
  }

  /**
   * Speak text with animalese synthesis.
   *
   * Each call creates an independent speech session. Multiple concurrent
   * speak() calls will overlap — caller should stop() previous handles
   * if sequential speech is desired.
   *
   * @param text - The text to speak.
   * @param options - Per-call options and callbacks.
   * @returns A SpeechHandle for controlling playback.
   * @throws Error if load() has not been called.
   */
  speak(text: string, options?: SpeakOptions): SpeechHandle {
    if (!this.letterBuffers) {
      throw new Error(
        "Samples not loaded. Call load() before speak().",
      );
    }

    const cfg = resolveConfig(this.config, options);
    const chars = processText(text, cfg.shortenWords);

    if (chars.length === 0) {
      // Nothing to speak — return an immediately finished handle
      const handle: SpeechHandle = {
        stop() {},
        pause() {},
        resume() {},
        finished: Promise.resolve(),
        get state() {
          return "finished" as const;
        },
      };
      options?.onComplete?.();
      return handle;
    }

    // Create a gain node for this speech session's volume
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = cfg.volume;
    gainNode.connect(this.destination);

    const state = createSchedulerState(chars, this.ctx.currentTime);

    let resolveFinished: () => void;
    const finishedPromise = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    // Start both loops
    startSchedulerLoop(
      this.ctx,
      state,
      this.letterBuffers,
      gainNode,
      cfg.basePitch,
      cfg.pitchRange,
      cfg.letterDuration,
    );
    startCallbackLoop(
      this.ctx,
      state,
      cfg.letterDuration,
      options?.onLetter,
      options?.onComplete,
      resolveFinished!,
    );

    const handle: SpeechHandle = {
      stop() {
        if (state.state === "stopped" || state.state === "finished") return;
        state.state = "stopped";
        stopScheduler(state);
        gainNode.disconnect();
        resolveFinished!();
      },

      pause() {
        if (state.state !== "playing") return;
        state.state = "paused";
        state.pausedAtCharIndex = state.nextCallbackIndex;
        stopScheduler(state);
      },

      resume: () => {
        if (state.state !== "paused") return;
        state.state = "playing";

        // Restart scheduling from where we paused
        // Use nextCallbackIndex since that's where the listener last heard
        state.nextCharIndex = state.pausedAtCharIndex;
        state.nextCharTime = this.ctx.currentTime;
        state.scheduledQueue = state.scheduledQueue.slice(
          0,
          state.pausedAtCharIndex,
        );
        state.nextCallbackIndex = state.pausedAtCharIndex;

        startSchedulerLoop(
          this.ctx,
          state,
          this.letterBuffers!,
          gainNode,
          cfg.basePitch,
          cfg.pitchRange,
          cfg.letterDuration,
        );
        startCallbackLoop(
          this.ctx,
          state,
          cfg.letterDuration,
          options?.onLetter,
          options?.onComplete,
          resolveFinished!,
        );
      },

      get finished() {
        return finishedPromise;
      },

      get state() {
        return state.state;
      },
    };

    return handle;
  }
}
