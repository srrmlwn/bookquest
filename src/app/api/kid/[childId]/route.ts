import { NextResponse } from "next/server";
import { handler, requireDevice } from "@/lib/auth";
import { kidState } from "@/lib/data";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ childId: string }> }) => {
  const { childId } = await ctx.params;
  return NextResponse.json(await kidState(await requireDevice(), childId));
});
