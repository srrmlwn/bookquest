import { NextResponse } from "next/server";
import {
  changePin,
  createFamily,
  deviceFamily,
  handler,
  HttpError,
  lock,
  requireGrownup,
  revokeOtherDevices,
  unlock,
  validPin,
} from "@/lib/auth";
import { pilotAccessStatus, validPilotAccessKey } from "@/lib/pilot-access";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { action?: string; pin?: unknown; accessKey?: unknown };
  const res = NextResponse.json({ ok: true });

  if (body.action === "lock") {
    lock(res);
    return res;
  }
  if (body.action === "revokeDevices") {
    await revokeOtherDevices(await requireGrownup(), res);
    return res;
  }
  if (!validPin(body.pin)) throw new HttpError(400, "pin_must_be_4_to_8_digits");

  if (body.action === "setup") {
    if ((body.pin as string).length < 6) throw new HttpError(400, "new_pin_must_be_6_to_8_digits");
    requirePilotAccess(body.accessKey);
    if (!(await createFamily(body.pin, res))) throw new HttpError(409, "already_set_up");
    return res;
  }
  if (body.action === "unlock") {
    if (!(await deviceFamily())) requirePilotAccess(body.accessKey);
    const r = await unlock(body.pin, res);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.lockedSeconds ? "locked" : "wrong_pin", lockedSeconds: r.lockedSeconds },
        { status: r.lockedSeconds ? 429 : 401 },
      );
    }
    return res;
  }
  if (body.action === "change") {
    if ((body.pin as string).length < 6) throw new HttpError(400, "new_pin_must_be_6_to_8_digits");
    await changePin(await requireGrownup(), body.pin, res);
    return res;
  }
  throw new HttpError(400, "unknown_action");
});

function requirePilotAccess(value: unknown) {
  const status = pilotAccessStatus();
  if (status.required && !status.configured) throw new HttpError(503, "pilot_access_not_configured");
  if (!validPilotAccessKey(value)) throw new HttpError(403, "access_key_required");
}
