"use client";

// Buddy uses browser speech synthesis, without a BookQuest API key.
// Some installed voices are network-backed; offline behavior depends on the voice.

const RATE_KEY = "bq_speech_rate";
const VOICE_KEY = "bq_voice";

export function getRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return v >= 0.5 && v <= 1.5 ? v : 0.95;
  } catch {
    return 0.95;
  }
}

export function setRate(rate: number) {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {}
}

export function getVoiceName(): string | null {
  try {
    return localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

export function setVoiceName(name: string | null) {
  try {
    if (name) localStorage.setItem(VOICE_KEY, name);
    else localStorage.removeItem(VOICE_KEY);
  } catch {}
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

// Prefer natural-sounding English voices when the device has them.
const PREFERRED = [/premium/i, /enhanced/i, /natural/i, /samantha/i, /google us english/i, /aria/i, /jenny/i, /karen/i, /moira/i];

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = listVoices();
  const saved = getVoiceName();
  if (saved) {
    const v = voices.find((x) => x.name === saved);
    if (v) return v;
  }
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name) && x.lang.startsWith("en-US")) || voices.find((x) => re.test(x.name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en-US")) || voices[0];
}

/** Call from a tap handler once, so iOS allows speech later in the session. */
export function unlockSpeech() {
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speak text and resolve when finished. Resolves even if the browser never fires
 * `end` (some do not), using a timer based on the text length.
 */
export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!speechSupported()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "en-US";
    u.rate = opts.rate ?? getRate();
    u.pitch = 1.1;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    // ~14 characters per second at rate 1, plus slack.
    const timer = setTimeout(finish, 1500 + (text.length / 14 / u.rate) * 1000 * 1.4);
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  });
}
