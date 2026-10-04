import { NextResponse } from "next/server";
import { handler, requireDevice } from "@/lib/auth";
import { kidChildren } from "@/lib/data";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  return NextResponse.json({ children: await kidChildren(await requireDevice()) });
});
