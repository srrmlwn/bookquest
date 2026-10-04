import { NextResponse } from "next/server";
import { deviceFamily, familyExists, grownupFamily, handler } from "@/lib/auth";
import { pilotAccessStatus } from "@/lib/pilot-access";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const setup = await familyExists();
  const trusted = setup && !!(await deviceFamily());
  const grownup = setup && !!(await grownupFamily());
  const access = pilotAccessStatus();
  return NextResponse.json({
    setup,
    trusted,
    grownup,
    accessKeyRequired: access.required && !trusted,
    accessKeyConfigured: access.configured,
  });
});
