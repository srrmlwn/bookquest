import { createHash, timingSafeEqual } from "node:crypto";

/** The access key is a server secret, never bundled into the client. */
export function pilotAccessStatus() {
  const key = process.env.PILOT_ACCESS_KEY;
  const configured = !!key && key.length >= 32 && key.length <= 256;
  return { required: !!key || process.env.NODE_ENV === "production", configured };
}

export function validPilotAccessKey(value: unknown): boolean {
  const status = pilotAccessStatus();
  if (!status.required) return true; // Local development only.
  if (!status.configured || typeof value !== "string" || value.length > 256) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(value), digest(process.env.PILOT_ACCESS_KEY!));
}
