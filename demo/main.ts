import { Animalese, type SpeechHandle } from "../src";

const textInput = document.getElementById("textInput") as HTMLInputElement;
const speakBtn = document.getElementById("speakBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const textContent = document.getElementById("textContent") as HTMLSpanElement;
const cursor = document.getElementById("cursor") as HTMLSpanElement;
const status = document.getElementById("status") as HTMLDivElement;

const pitchSlider = document.getElementById("pitchSlider") as HTMLInputElement;
const pitchValue = document.getElementById("pitchValue") as HTMLSpanElement;
const variationSlider = document.getElementById("variationSlider") as HTMLInputElement;
const variationValue = document.getElementById("variationValue") as HTMLSpanElement;
const speedSlider = document.getElementById("speedSlider") as HTMLInputElement;
const speedValue = document.getElementById("speedValue") as HTMLSpanElement;
const volumeSlider = document.getElementById("volumeSlider") as HTMLInputElement;
const volumeValue = document.getElementById("volumeValue") as HTMLSpanElement;
const shortenCheck = document.getElementById("shortenCheck") as HTMLInputElement;

// Update slider display values
for (const [slider, display, suffix] of [
  [pitchSlider, pitchValue, ""],
  [variationSlider, variationValue, ""],
  [speedSlider, speedValue, "s"],
  [volumeSlider, volumeValue, ""],
] as const) {
  (slider as HTMLInputElement).addEventListener("input", () => {
    (display as HTMLSpanElement).textContent = (slider as HTMLInputElement).value + suffix;
  });
}

const ctx = new AudioContext();
const animalese = new Animalese(ctx);

let currentHandle: SpeechHandle | null = null;

// Load samples
status.textContent = "Loading samples...";
animalese
  .load("/animalese.wav")
  .then(() => {
    status.textContent = "Ready";
    speakBtn.disabled = false;
  })
  .catch((err) => {
    status.textContent = `Failed to load: ${err.message}`;
  });

function setPlaying(playing: boolean) {
  speakBtn.disabled = playing;
  pauseBtn.disabled = !playing;
  stopBtn.disabled = !playing;
  textInput.disabled = playing;
}

function resetDisplay() {
  textContent.textContent = "";
  cursor.style.display = "inline-block";
  setPlaying(false);
  currentHandle = null;
}

speakBtn.addEventListener("click", () => {
  // Resume AudioContext on user gesture (browser autoplay policy)
  if (ctx.state === "suspended") ctx.resume();

  const message = textInput.value;
  if (!message) return;

  // Stop any current speech
  currentHandle?.stop();

  textContent.textContent = "";
  cursor.style.display = "inline-block";
  setPlaying(true);
  status.textContent = "Speaking...";

  currentHandle = animalese.speak(message, {
    basePitch: parseFloat(pitchSlider.value),
    pitchRange: parseFloat(variationSlider.value),
    letterDuration: parseFloat(speedSlider.value),
    volume: parseFloat(volumeSlider.value),
    shortenWords: shortenCheck.checked,

    onLetter({ index }) {
      // Typewriter: show text up to current index
      textContent.textContent = message.slice(0, index + 1);
    },

    onComplete() {
      // Reveal full text on completion (important when shortenWords is on,
      // since onLetter only fires for first letters of words)
      textContent.textContent = message;
      cursor.style.display = "none";
      status.textContent = "Done";
      setPlaying(false);
      currentHandle = null;
    },
  });
});

pauseBtn.addEventListener("click", () => {
  if (!currentHandle) return;

  if (currentHandle.state === "playing") {
    currentHandle.pause();
    pauseBtn.textContent = "Resume";
    status.textContent = "Paused";
  } else if (currentHandle.state === "paused") {
    currentHandle.resume();
    pauseBtn.textContent = "Pause";
    status.textContent = "Speaking...";
  }
});

stopBtn.addEventListener("click", () => {
  currentHandle?.stop();
  cursor.style.display = "none";
  status.textContent = "Stopped";
  setPlaying(false);
  pauseBtn.textContent = "Pause";
  currentHandle = null;
});

// Enter key to speak
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !speakBtn.disabled) {
    speakBtn.click();
  }
});
