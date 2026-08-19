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

  const existing = await prisma.checkIn.findUnique({
    where: {
      guestId_stageId: { guestId, stageId: parsed.data.stageId },
    },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyChecked: true,
      checkIn: existing,
      message: "Уже отмечен на этом этапе",
    });
  }

  const scannedBy = parsed.data.scannedBy?.trim() || "сканер";

  try {
    const checkIn = await prisma.checkIn.create({
      data: {
        guestId,
        stageId: parsed.data.stageId,
        scannedBy,
      },
      include: { guest: true, stage: true },
    });

    return NextResponse.json(
      {
        ok: true,
        alreadyChecked: false,
        checkIn,
        message: `Зарегистрирован на этапе «${stage.name}»`,
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
