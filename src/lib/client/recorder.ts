"use client";

// Records one answer at a time. The microphone is opened only while listening and
// closed right after, so Buddy's voice plays normally and the mic is never left on.

export type Recording = { stop: () => Promise<Blob | null>; cancel: () => void };

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

export function recordingSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

/** Opens the mic and starts recording. Throws if the mic is unavailable or denied. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mimeType = pickMime();
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.start(1000);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise((resolve) => {
        if (rec.state === "inactive") {
          release();
          return resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || mimeType }) : null);
        }
        rec.onstop = () => {
          release();
          resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || mimeType }) : null);
        };
        rec.stop();
      }),
    cancel: () => {
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {}
      release();
    },
  };
}
