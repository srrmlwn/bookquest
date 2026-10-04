import { NextResponse } from "next/server";
import { changePin, createFamily, handler, HttpError, lock, requireGrownup, unlock, validPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { action?: string; pin?: unknown };
  const res = NextResponse.json({ ok: true });

  if (body.action === "lock") {
    lock(res);
    return res;
  }
  if (!validPin(body.pin)) throw new HttpError(400, "pin_must_be_4_to_8_digits");

  if (body.action === "setup") {
    if (!(await createFamily(body.pin, res))) throw new HttpError(409, "already_set_up");
    return res;
  }
  if (body.action === "unlock") {
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
    await changePin(await requireGrownup(), body.pin);
    return res;
  }
  throw new HttpError(400, "unknown_action");
});
