import { LOOKAHEAD_MS, SCHEDULE_AHEAD_TIME } from "./constants";
import type { ProcessedChar } from "./text-processor";
import type { OnLetterCallback, OnCompleteCallback, ScheduledLetter } from "./types";

/** Internal state for an active speech session. */
export interface SchedulerState {
  chars: ProcessedChar[];
  /** Next character index to schedule into Web Audio. */
  nextCharIndex: number;
  /** AudioContext time when the next character should start. */
  nextCharTime: number;
  /** Queue of scheduled letters (for rAF callback matching). */
  scheduledQueue: ScheduledLetter[];
  /** Next index in scheduledQueue to fire onLetter for. */
  nextCallbackIndex: number;
  /** Active AudioBufferSourceNodes (for stop/cleanup). */
  activeSources: AudioBufferSourceNode[];
  timerId: ReturnType<typeof setTimeout> | null;
  rafId: number | null;
  state: "playing" | "paused" | "stopped" | "finished";
  /** Character index where we paused (for resume). */
  pausedAtCharIndex: number;
}

export function createSchedulerState(
  chars: ProcessedChar[],
  startTime: number,
): SchedulerState {
  return {
    chars,
    nextCharIndex: 0,
    nextCharTime: startTime,
    scheduledQueue: [],
    nextCallbackIndex: 0,
    activeSources: [],
    timerId: null,
    rafId: null,
    state: "playing",
    pausedAtCharIndex: 0,
  };
}

/**
 * The core lookahead scheduling loop. Runs via setTimeout every ~25ms.
 * Schedules AudioBufferSourceNode.start() calls with precise future times
 * using AudioContext.currentTime.
 *
 * The lookahead of 100ms ensures at least 1 letter is always in the pipeline
 * (letter duration = 75ms), while keeping cancel latency low.
 */
export function startSchedulerLoop(
  ctx: AudioContext,
  state: SchedulerState,
  letterBuffers: AudioBuffer[],
  gainNode: GainNode,
  basePitch: number,
  pitchRange: number,
  letterDuration: number,
): void {
  function tick() {
    if (state.state !== "playing") return;

    while (
      state.nextCharIndex < state.chars.length &&
      state.nextCharTime < ctx.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const char = state.chars[state.nextCharIndex];

      if (char.letterIndex >= 0) {
        const source = ctx.createBufferSource();
        source.buffer = letterBuffers[char.letterIndex];

        // Pitch = basePitch + random variation in [-pitchRange/2, +pitchRange/2]
        const pitchVariation = (Math.random() - 0.5) * pitchRange;
        source.playbackRate.value = basePitch + pitchVariation;

        source.connect(gainNode);
        source.start(state.nextCharTime);

        state.activeSources.push(source);
        source.onended = () => {
          const idx = state.activeSources.indexOf(source);
          if (idx !== -1) state.activeSources.splice(idx, 1);
        };
      }

      state.scheduledQueue.push({
        char: char.char,
        index: char.originalIndex,
        time: state.nextCharTime,
        isSilent: char.letterIndex < 0,
      });

      state.nextCharTime += letterDuration;
      state.nextCharIndex++;
    }

    if (state.nextCharIndex < state.chars.length && state.state === "playing") {
      state.timerId = setTimeout(tick, LOOKAHEAD_MS);
    }
  }

  tick();
}

/**
 * The rAF callback loop. Fires onLetter callbacks synchronized to actual
 * audio playback by comparing AudioContext.currentTime against scheduled times.
 *
 * Separated from the scheduling loop because:
 * - Audio scheduling needs reliability (setTimeout)
 * - Visual callbacks need frame-rate sync (rAF)
 */
export function startCallbackLoop(
  ctx: AudioContext,
  state: SchedulerState,
  letterDuration: number,
  onLetter?: OnLetterCallback,
  onComplete?: OnCompleteCallback,
  resolveFinished?: () => void,
): void {
  function draw() {
    if (state.state !== "playing") return;

    const currentTime = ctx.currentTime;

    // Fire callbacks for all letters whose scheduled time has passed
    while (
      state.nextCallbackIndex < state.scheduledQueue.length &&
      state.scheduledQueue[state.nextCallbackIndex].time <= currentTime
    ) {
      onLetter?.(state.scheduledQueue[state.nextCallbackIndex]);
      state.nextCallbackIndex++;
    }

    // Check completion: all characters scheduled AND all callbacks fired
    // AND last letter has had time to finish playing
    const allScheduled = state.nextCharIndex >= state.chars.length;
    const allCallbacksFired =
      state.nextCallbackIndex >= state.scheduledQueue.length;

    if (allScheduled && allCallbacksFired) {
      const lastEntry = state.scheduledQueue[state.scheduledQueue.length - 1];
      const lastLetterDone =
        !lastEntry || currentTime > lastEntry.time + letterDuration;

      if (lastLetterDone) {
        state.state = "finished";
        onComplete?.();
        resolveFinished?.();
        return;
      }
    }

    state.rafId = requestAnimationFrame(draw);
  }

  state.rafId = requestAnimationFrame(draw);
}

/** Stop all active source nodes and clear timers. */
export function stopScheduler(state: SchedulerState): void {
  if (state.timerId !== null) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  for (const source of state.activeSources) {
    try {
      source.stop();
      source.disconnect();
    } catch {
      // Source may have already ended
    }
  }
  state.activeSources = [];
}
