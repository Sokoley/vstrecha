import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  badgeCode: z.string().min(1).optional(),
  guestId: z.string().min(1).optional(),
  stageId: z.string().min(1),
  scannedBy: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  let guestId = parsed.data.guestId;
  if (!guestId && parsed.data.badgeCode) {
    const code = parsed.data.badgeCode.trim();
    const guest = await prisma.guest.findUnique({ where: { badgeCode: code } });
    if (!guest) {
      return NextResponse.json({ error: "Гость с таким QR не найден" }, { status: 404 });
    }
    guestId = guest.id;
  }
  if (!guestId) {
    return NextResponse.json({ error: "Не указан гость" }, { status: 400 });
  }

  const stage = await prisma.stage.findUnique({ where: { id: parsed.data.stageId } });
  if (!stage || !stage.isActive) {
    return NextResponse.json({ error: "Этап недоступен" }, { status: 400 });
  }

  const existingSelected = await prisma.checkIn.findUnique({
    where: {
      guestId_stageId: { guestId, stageId: parsed.data.stageId },
    },
  });

  if (existingSelected) {
    return NextResponse.json({
      ok: true,
      alreadyChecked: true,
      checkIn: existingSelected,
      message: "Уже отмечен на этом этапе",
    });
  }

  // Все активные этапы до выбранного включительно (по порядку)
  const stagesToPass = await prisma.stage.findMany({
    where: {
      isActive: true,
      sortOrder: { lte: stage.sortOrder },
    },
    orderBy: { sortOrder: "asc" },
  });

  const existing = await prisma.checkIn.findMany({
    where: {
      guestId,
      stageId: { in: stagesToPass.map((s) => s.id) },
    },
  });
  const existingIds = new Set(existing.map((c) => c.stageId));
  const missing = stagesToPass.filter((s) => !existingIds.has(s.id));
  const scannedBy = parsed.data.scannedBy?.trim() || "сканер";

  try {
    if (missing.length) {
      await prisma.checkIn.createMany({
        data: missing.map((s) => ({
          guestId,
          stageId: s.id,
          scannedBy,
        })),
        skipDuplicates: true,
      });
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { guestId_stageId: { guestId, stageId: parsed.data.stageId } },
      include: { guest: true, stage: true },
    });

    const autoFilled = missing.filter((s) => s.id !== parsed.data.stageId).map((s) => s.name);

    return NextResponse.json(
      {
        ok: true,
        alreadyChecked: false,
        checkIn,
        autoFilledStages: autoFilled,
        message: autoFilled.length
          ? `Зарегистрирован. Также отмечены: ${autoFilled.join(", ")}`
          : "Зарегистрирован",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const checkIn = await prisma.checkIn.findUnique({
        where: { guestId_stageId: { guestId, stageId: parsed.data.stageId } },
        include: { guest: true, stage: true },
      });
      return NextResponse.json({
        ok: true,
        alreadyChecked: true,
        checkIn,
        message: "Уже отмечен на этом этапе",
      });
    }
    throw error;
  }
}
