"use client";

export type RecordingPreferences = { enabled: boolean; retentionDays: 1 | 7 | 30 };
const KEY = "bq_recording_preferences";
const DEFAULTS: RecordingPreferences = { enabled: false, retentionDays: 7 };

export function getRecordingPreferences(): RecordingPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return {
      enabled: value?.enabled === true,
      retentionDays: [1, 7, 30].includes(value?.retentionDays) ? value.retentionDays : 7,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setRecordingPreferences(value: RecordingPreferences) {
  if (typeof value.enabled !== "boolean" || ![1, 7, 30].includes(value.retentionDays))
    throw new Error("Invalid recording preferences");
  // A failed write must be visible to the parent; never claim it was saved.
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("bq-recording-preferences"));
}

export function recordingExpired(createdAt: number, now = Date.now()): boolean {
  return !Number.isFinite(createdAt) || createdAt <= now - getRecordingPreferences().retentionDays * 86_400_000;
}
