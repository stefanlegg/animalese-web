# animalese-web

Modern Web Audio API library for synthesizing Animal Crossing "animalese" speech with real-time streaming playback, typewriter sync callbacks, and full playback control.

A ground-up rewrite of [animalese.js](https://github.com/Acedio/animalese.js) using modern web standards. **[Try the live demo](https://stefanlegg.github.io/animalese-web/)**

## Features

- **Real-time streaming** — audio plays letter-by-letter via Web Audio API lookahead scheduling, not generated all at once
- **Typewriter sync** — `onLetter` callback fires in sync with each letter's audio, perfect for text reveal effects
- **Playback control** — stop, pause, and resume speech with `SpeechHandle`
- **Async-friendly** — `finished` Promise resolves when speech completes naturally
- **Per-call overrides** — change pitch, speed, or volume for individual `speak()` calls (great for character voices)
- **Custom audio routing** — connect output to any `AudioNode` for effects chains
- **Zero runtime dependencies** — ~5 KB ESM / ~4 KB CJS
- **Full TypeScript** — complete type definitions with JSDoc
- **Dual package** — ESM + CJS with proper `exports` field, tree-shakeable

## Comparison with animalese.js

| Aspect | animalese.js | animalese-web |
|---|---|---|
| **Audio engine** | Synchronous WAV data URI via `new Audio()` | Web Audio API with lookahead scheduling |
| **Pitch shifting** | Sample-index stepping (aliasing artifacts) | Native `playbackRate` (hardware-interpolated) |
| **Playback control** | None — fire and forget | stop / pause / resume / `finished` Promise |
| **Typewriter sync** | None | `onLetter` callback synced to audio time |
| **Runtime deps** | 3 (riffwave.js, Blob.js, FileSaver.js) | 0 |
| **Types** | None | Full TypeScript |
| **Module format** | Global script tag | ESM + CJS dual package |
| **Word shortening** | First + last character | First character only (matches AC games) |
| **Concurrent speech** | Not supported | Multiple overlapping `speak()` calls |
| **Volume control** | Not supported | Per-call volume via `GainNode` |

### Why rewrite?

The original animalese.js pioneered the concept — full credit to [Acedio](https://github.com/Acedio) for the idea and the sample library. But its approach of generating an entire WAV file synchronously and playing it through `new Audio()` means:

- No way to stop, pause, or control playback once started
- No way to sync visual effects (like typewriter text) to the audio
- Pitch shifting via sample-index stepping introduces aliasing artifacts
- Three runtime dependencies for WAV encoding and file saving that aren't needed for web playback

animalese-web solves all of these by building on the Web Audio API, which provides precise scheduling, native pitch shifting, and fine-grained playback control.

## Installation

```bash
npm install animalese-web
```

The package includes the `animalese.wav` sample library (172 KB) in `assets/`. You can serve it statically or import it depending on your bundler setup.

## Quick Start

```typescript
import { Animalese } from "animalese-web";

const ctx = new AudioContext();
const animalese = new Animalese(ctx);

// Load the sample library (do this once)
await animalese.load("/animalese.wav");

// Speak!
animalese.speak("Hello! Welcome to my island!");
```

### With typewriter sync

```typescript
const handle = animalese.speak("Hello! Welcome to my island!", {
  onLetter({ char, index }) {
    // Reveal text up to the current letter
    display.textContent = text.slice(0, index + 1);
  },
  onComplete() {
    // Speech finished naturally
    display.textContent = text;
  },
});
```

## API Reference

### `new Animalese(ctx, config?)`

Creates an Animalese synthesizer instance.

- `ctx` — An `AudioContext`. You own this and must handle autoplay policy (call `ctx.resume()` on a user gesture before speaking).
- `config` — Optional default configuration, overridable per `speak()` call.

### `AnimaleseConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `basePitch` | `number` | `1.0` | Base pitch multiplier. `>1` = higher, `<1` = lower |
| `pitchRange` | `number` | `0.25` | Random pitch variation per letter (e.g., 0.25 = +/- 0.125) |
| `letterDuration` | `number` | `0.075` | Duration of each letter in seconds |
| `shortenWords` | `boolean` | `false` | Shorten words to first letter only (AC style) |
| `volume` | `number` | `1.0` | Volume from 0.0 to 1.0 |
| `destination` | `AudioNode` | `ctx.destination` | Audio node to connect output to |

### `animalese.load(source)`

```typescript
async load(source: string | ArrayBuffer | Response): Promise<void>
```

Loads and decodes the WAV sample library. Must be called once before `speak()`. Accepts a URL string, an `ArrayBuffer`, or a `fetch()` `Response`. Idempotent — subsequent calls reload the samples.

### `animalese.isLoaded`

```typescript
get isLoaded(): boolean
```

Returns `true` if samples have been loaded and the instance is ready to speak. Useful for gating UI (e.g., disabling a "Speak" button until ready).

### `animalese.speak(text, options?)`

```typescript
speak(text: string, options?: SpeakOptions): SpeechHandle
```

Speaks text with animalese synthesis. Returns immediately with a `SpeechHandle` for controlling playback.

- Multiple concurrent `speak()` calls will overlap — stop the previous handle if sequential speech is desired.
- Throws if `load()` has not been called.

### `animalese.dispose()`

```typescript
dispose(): void
```

Releases the decoded sample buffers from memory. After calling `dispose()`, `load()` must be called again before speaking. Useful for cleanup in single-page applications.

### `SpeakOptions`

All `AnimaleseConfig` fields can be overridden per call, plus:

| Option | Type | Description |
|---|---|---|
| `onLetter` | `(letter: ScheduledLetter) => void` | Fires when each letter starts playing. Primary hook for typewriter sync. |
| `onComplete` | `() => void` | Fires when speech finishes naturally (not on `stop()`). |

### `SpeechHandle`

Returned by `speak()`. Controls an active speech session.

| Member | Type | Description |
|---|---|---|
| `stop()` | `() => void` | Stop playback immediately. Cannot be resumed. |
| `pause()` | `() => void` | Pause playback. Position is saved for resume. |
| `resume()` | `() => void` | Resume playback after pause. |
| `finished` | `Promise<void>` | Resolves when speech finishes naturally or is stopped. |
| `state` | `'playing' \| 'paused' \| 'stopped' \| 'finished'` | Current playback state. |

### `ScheduledLetter`

Object passed to the `onLetter` callback.

| Field | Type | Description |
|---|---|---|
| `char` | `string` | The character from the original input string |
| `index` | `number` | Position in the original input string |
| `time` | `number` | `AudioContext.currentTime` when this letter was scheduled |
| `isSilent` | `boolean` | `true` for spaces, punctuation, and other non-letter characters |

## Recipes

### Pause and resume

```typescript
const handle = animalese.speak("A long piece of dialogue...");

// Later...
handle.pause();
console.log(handle.state); // "paused"

// Resume from where we left off
handle.resume();
```

### Await completion

```typescript
const handle = animalese.speak("First line of dialogue.");
await handle.finished;

animalese.speak("Second line, after the first finishes.");
```

### Character voices with per-call pitch

```typescript
// Low, grumbly voice
animalese.speak("I'm Tom Nook.", { basePitch: 0.7 });

// High, peppy voice
animalese.speak("Hi there!", { basePitch: 1.5, pitchRange: 0.3 });
```

### Custom audio destination

```typescript
// Route through a reverb effect
const convolver = ctx.createConvolver();
convolver.connect(ctx.destination);

const animalese = new Animalese(ctx, { destination: convolver });
```

### Stopping previous speech

```typescript
let currentHandle: SpeechHandle | null = null;

function say(text: string) {
  currentHandle?.stop();
  currentHandle = animalese.speak(text, {
    onComplete() { currentHandle = null; },
  });
}
```

## Browser Autoplay Policy

Modern browsers block audio playback until a user gesture (click, tap, keypress) has occurred. You must resume the `AudioContext` inside a user-initiated event handler:

```typescript
button.addEventListener("click", () => {
  if (ctx.state === "suspended") ctx.resume();
  animalese.speak("Hello!");
});
```

## How It Works

The `animalese.wav` file contains 26 sequential letter samples (A–Z), each 150ms long. When `load()` is called, the file is decoded via `decodeAudioData()` and sliced into 26 individual `AudioBuffer` objects — one per letter. This is sample-rate independent; the Web Audio API handles resampling automatically.

When `speak()` is called, input text is mapped to a sequence of letter indices (A=0, B=1, ..., Z=25, everything else = silence). If `shortenWords` is enabled, each word is reduced to its first letter.

Two concurrent loops drive playback:

- **Scheduler loop** (setTimeout, 25ms interval) — looks 100ms ahead and schedules `AudioBufferSourceNode.start()` calls at precise future times using `AudioContext.currentTime`. Each letter gets a pitch of `basePitch + random variation`. This lookahead prevents audio dropouts while keeping cancel latency low.

- **Callback loop** (requestAnimationFrame) — compares `AudioContext.currentTime` against scheduled letter times and fires `onLetter` callbacks in sync with actual audio playback. This separation ensures visual updates run at display refresh rate while audio scheduling remains reliable.

Pause saves the current position and stops all active audio nodes. Resume restarts both loops from the saved position with fresh timing.

## Demo

**[Live demo](https://stefanlegg.github.io/animalese-web/)** — try it in your browser.

The `demo/` directory contains an interactive demo with:

- Text input with typewriter text reveal
- Real-time sliders for pitch, variation, speed, and volume
- Pause / resume / stop controls
- Word shortening toggle

Run it locally:

```bash
pnpm install
pnpm dev
```

Opens on `http://localhost:3000`.

## Credits

- Original [animalese.js](https://github.com/Acedio/animalese.js) by [Acedio](https://github.com/Acedio) — the idea and the `animalese.wav` sample library
- Animal Crossing is a trademark of Nintendo. This project is fan-made and is not affiliated with or endorsed by Nintendo.

## License

[MIT](LICENSE)
