import { LETTER_COUNT, LIBRARY_LETTER_DURATION } from "./constants";

/**
 * Pre-slices a decoded AudioBuffer containing 26 sequential letter samples
 * into individual AudioBuffers (one per letter A-Z).
 *
 * Uses time-based offsets (not hardcoded sample counts) so this works
 * regardless of the AudioContext's sample rate — decodeAudioData resamples
 * the source WAV to match the context's rate automatically.
 */
export function sliceLetterSamples(
  ctx: AudioContext,
  masterBuffer: AudioBuffer,
): AudioBuffer[] {
  const sampleRate = masterBuffer.sampleRate;
  const samplesPerLetter = Math.round(LIBRARY_LETTER_DURATION * sampleRate);
  const channelData = masterBuffer.getChannelData(0);
  const buffers: AudioBuffer[] = [];

  for (let i = 0; i < LETTER_COUNT; i++) {
    const start = i * samplesPerLetter;
    const end = Math.min(start + samplesPerLetter, channelData.length);
    const segment = channelData.slice(start, end);

    const letterBuffer = ctx.createBuffer(1, segment.length, sampleRate);
    letterBuffer.getChannelData(0).set(segment);
    buffers.push(letterBuffer);
  }

  return buffers;
}

/**
 * Load and decode an audio source into an AudioBuffer.
 * Accepts a URL string, ArrayBuffer, or fetch Response.
 */
export async function loadAudioBuffer(
  ctx: AudioContext,
  source: string | ArrayBuffer | Response,
): Promise<AudioBuffer> {
  let arrayBuffer: ArrayBuffer;

  if (source instanceof ArrayBuffer) {
    // decodeAudioData detaches the buffer in some browsers, so clone it
    arrayBuffer = source.slice(0);
  } else if (source instanceof Response) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    arrayBuffer = await response.arrayBuffer();
  }

  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    throw new Error(
      `Failed to decode audio data. Ensure the source is a valid audio file. (${err instanceof Error ? err.message : err})`,
    );
  }

  const minSamples = Math.round(LETTER_COUNT * LIBRARY_LETTER_DURATION * decoded.sampleRate);
  if (decoded.length < minSamples) {
    throw new Error(
      `Audio buffer too short: expected at least ${minSamples} samples for ${LETTER_COUNT} letters, got ${decoded.length}.`,
    );
  }

  return decoded;
}
