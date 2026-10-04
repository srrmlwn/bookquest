import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DbNotConfigured, one, query } from "./db";

// Two cookies, both HMAC-signed with the family's secret:
//  - device:  this phone/tablet is trusted to run Kid Mode (1 year)
//  - grownup: a grown-up entered the PIN recently (30 minutes)
const DEVICE_COOKIE = "bq_device";
const GROWNUP_COOKIE = "bq_grownup";
const DEVICE_TTL_S = 365 * 24 * 3600;
const GROWNUP_TTL_S = 30 * 60;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

type Family = {
  id: string;
  pin_hash: string;
  pin_salt: string;
  cookie_secret: string;
  failed_attempts: number;
  locked_until: string | null;
};

type Kind = "device" | "grownup";

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function makeToken(f: Family, kind: Kind, ttl: number) {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${f.id}.${kind}.${exp}`;
  return `${payload}.${sign(f.cookie_secret, payload)}`;
}

async function readToken(kind: Kind): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(kind === "device" ? DEVICE_COOKIE : GROWNUP_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [familyId, k, exp, sig] = parts;
  if (k !== kind || Number(exp) < Date.now() / 1000) return null;
  if (!/^[0-9a-f-]{36}$/.test(familyId)) return null;
  const f = await one<Family>("SELECT * FROM families WHERE id = $1", [familyId]);
  if (!f) return null;
  const expected = Buffer.from(sign(f.cookie_secret, `${familyId}.${k}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return familyId;
}

/** Family id for a trusted device (or a grown-up session), else null. */
export async function deviceFamily(): Promise<string | null> {
  return (await readToken("device")) ?? (await readToken("grownup"));
}

/** Family id when a grown-up entered the PIN recently, else null. */
export async function grownupFamily(): Promise<string | null> {
  return readToken("grownup");
}

export async function familyExists(): Promise<boolean> {
  return !!(await one("SELECT id FROM families LIMIT 1"));
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function setSessionCookies(res: NextResponse, f: Family) {
  res.cookies.set(DEVICE_COOKIE, makeToken(f, "device", DEVICE_TTL_S), cookieOpts(DEVICE_TTL_S));
  res.cookies.set(GROWNUP_COOKIE, makeToken(f, "grownup", GROWNUP_TTL_S), cookieOpts(GROWNUP_TTL_S));
}

export function validPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

/** First run: create the family with its PIN. Refuses if a family already exists. */
export async function createFamily(pin: string, res: NextResponse): Promise<boolean> {
  if (await familyExists()) return false;
  const salt = randomBytes(16).toString("hex");
  const f: Family = {
    id: randomUUID(),
    pin_salt: salt,
    pin_hash: hashPin(pin, salt),
    cookie_secret: randomBytes(32).toString("hex"),
    failed_attempts: 0,
    locked_until: null,
  };
  await query(
    "INSERT INTO families (id, pin_hash, pin_salt, cookie_secret) VALUES ($1, $2, $3, $4)",
    [f.id, f.pin_hash, f.pin_salt, f.cookie_secret],
  );
  setSessionCookies(res, f);
  return true;
}

export type UnlockResult = { ok: true } | { ok: false; lockedSeconds?: number };

/** Check the PIN (single-family pilot: the one family row). Rate-limited. */
export async function unlock(pin: string, res: NextResponse): Promise<UnlockResult> {
  const f = await one<Family>("SELECT * FROM families ORDER BY created_at LIMIT 1");
  if (!f) return { ok: false };
  if (f.locked_until && new Date(f.locked_until).getTime() > Date.now()) {
    return { ok: false, lockedSeconds: Math.ceil((new Date(f.locked_until).getTime() - Date.now()) / 1000) };
  }
  const given = Buffer.from(hashPin(pin, f.pin_salt));
  const expected = Buffer.from(f.pin_hash);
  if (given.length === expected.length && timingSafeEqual(given, expected)) {
    await query("UPDATE families SET failed_attempts = 0, locked_until = NULL WHERE id = $1", [f.id]);
    setSessionCookies(res, f);
    return { ok: true };
  }
  const attempts = f.failed_attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await query(
      `UPDATE families SET failed_attempts = 0, locked_until = now() + interval '${LOCK_MINUTES} minutes' WHERE id = $1`,
      [f.id],
    );
    return { ok: false, lockedSeconds: LOCK_MINUTES * 60 };
  }
  await query("UPDATE families SET failed_attempts = $2 WHERE id = $1", [f.id, attempts]);
  return { ok: false };
}

export function lock(res: NextResponse) {
  res.cookies.set(GROWNUP_COOKIE, "", cookieOpts(0));
}

export async function changePin(familyId: string, pin: string) {
  const salt = randomBytes(16).toString("hex");
  await query("UPDATE families SET pin_hash = $2, pin_salt = $3 WHERE id = $1", [
    familyId,
    hashPin(pin, salt),
    salt,
  ]);
}

/** Wrap a route handler: maps auth failures and a missing database to JSON errors. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof DbNotConfigured) {
        return NextResponse.json({ error: "no_database" }, { status: 503 });
      }
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error("route error", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireDevice() {
  const id = await deviceFamily();
  if (!id) throw new HttpError(401, "not_trusted");
  return id;
}

export async function requireGrownup() {
  const id = await grownupFamily();
  if (!id) throw new HttpError(401, "pin_required");
  return id;
}
