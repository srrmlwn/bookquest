import { NextResponse } from "next/server";
import { handler, requireDevice } from "@/lib/auth";
import { completeBook } from "@/lib/data";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request, ctx: { params: Promise<{ childId: string }> }) => {
  const { childId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json(await completeBook(await requireDevice(), childId, body));
});
