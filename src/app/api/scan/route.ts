import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Не указан код" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { badgeCode: code },
    include: {
      checkIns: {
        include: { stage: true },
        orderBy: { scannedAt: "asc" },
      },
    },
  });

  if (!guest) {
    return NextResponse.json({ error: "Гость не найден" }, { status: 404 });
  }

  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const checkInByStage = Object.fromEntries(guest.checkIns.map((c) => [c.stageId, c]));

  return NextResponse.json({
    guest,
    stages: stages.map((stage) => ({
      ...stage,
      checkIn: checkInByStage[stage.id] || null,
      passed: Boolean(checkInByStage[stage.id]),
    })),
  });
}
