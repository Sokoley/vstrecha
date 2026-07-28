import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";



export async function GET() {
  const [guestCount, stages, checkIns] = await Promise.all([
    prisma.guest.count(),
    prisma.stage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.checkIn.findMany({ select: { stageId: true, guestId: true } }),
  ]);

  const byStage = stages.map((stage) => {
    const passed = new Set(checkIns.filter((c) => c.stageId === stage.id).map((c) => c.guestId)).size;
    return {
      id: stage.id,
      name: stage.name,
      isActive: stage.isActive,
      sortOrder: stage.sortOrder,
      passed,
      missing: guestCount - passed,
      percent: guestCount ? Math.round((passed / guestCount) * 100) : 0,
    };
  });

  const guestsWithAny = new Set(checkIns.map((c) => c.guestId)).size;

  return NextResponse.json({
    guestCount,
    guestsWithAnyCheckIn: guestsWithAny,
    guestsNeverCheckedIn: guestCount - guestsWithAny,
    stages: byStage,
  });
}
