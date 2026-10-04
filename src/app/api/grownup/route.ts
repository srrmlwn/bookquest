import { NextResponse } from "next/server";
import { handler, requireGrownup } from "@/lib/auth";
import { grownupData, grownupOp } from "@/lib/data";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  return NextResponse.json(await grownupData(await requireGrownup()));
});

export const POST = handler(async (req: Request) => {
  const familyId = await requireGrownup();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await grownupOp(familyId, body);
  return NextResponse.json({ ok: true, ...(result ?? {}) });
});
