import { NextResponse } from "next/server";
import { deviceFamily, familyExists, grownupFamily, handler } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const setup = await familyExists();
  const trusted = setup && !!(await deviceFamily());
  const grownup = setup && !!(await grownupFamily());
  return NextResponse.json({ setup, trusted, grownup });
});
