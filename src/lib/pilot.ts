// Shared labels and types for parent observations. Never sent to an AI provider.
export const STARTED_BY = [
  ["child", "Child picked up a book"],
  ["parent", "Grown-up suggested it"],
  ["together", "We chose together"],
  ["unknown", "Not sure"],
] as const;
export const HELP = [
  ["unknown", "Not sure / not applicable"],
  ["none", "No help"],
  ["little", "A little help"],
  ["lots", "Lots of help"],
] as const;
export const ENJOYMENT = [
  ["yes", "Enjoyed it"],
  ["mixed", "Mixed"],
  ["no", "Didn't enjoy it"],
  ["unknown", "Not sure"],
] as const;
export const REPEAT = [
  ["yes", "Asked for another quest"],
  ["no", "Didn't want another"],
  ["not_yet", "Not asked yet"],
] as const;
export const EXPERIMENTS = [
  ["baseline", "Reading without BookQuest"],
  ["guided", "Buddy's guided questions"],
  ["parent_led_ai", "Parent-led AI experiment"],
] as const;
export type Observation = {
  id: string;
  child_id: string;
  observed_on: string;
  started_by: (typeof STARTED_BY)[number][0];
  help_needed: (typeof HELP)[number][0];
  enjoyment: (typeof ENJOYMENT)[number][0];
  repeat_quest: (typeof REPEAT)[number][0];
  experiment: (typeof EXPERIMENTS)[number][0];
  notes: string;
  created_at: string;
};

export function validObservationDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
