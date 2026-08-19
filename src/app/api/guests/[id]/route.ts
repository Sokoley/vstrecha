import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const guestSchema = z.object({
  fullName: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  badgeCode: z.string().min(1).optional(),
  stageIds: z.array(z.string().min(1)).optional(),
});

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const guest = await prisma.guest.findUnique({
    where: { id: params.id },
    include: {
      checkIns: { include: { stage: true }, orderBy: { scannedAt: "asc" } },
    },
  });
  if (!guest) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  return NextResponse.json(guest);
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const parsed = guestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const existing = await prisma.guest.findUnique({
    where: { id: params.id },
    include: { checkIns: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }

  if (parsed.data.stageIds !== undefined) {
    const uniqueStageIds = Array.from(new Set(parsed.data.stageIds));
    if (uniqueStageIds.length) {
      const stages = await prisma.stage.findMany({
        where: { id: { in: uniqueStageIds } },
        select: { id: true },
      });
      if (stages.length !== uniqueStageIds.length) {
        return NextResponse.json({ error: "Указан несуществующий этап" }, { status: 400 });
      }
    }
  }

  try {
    const guest = await prisma.$transaction(async (tx) => {
      const updated = await tx.guest.update({
        where: { id: params.id },
        data: {
          ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName.trim() } : {}),
          ...(parsed.data.company !== undefined ? { company: parsed.data.company?.trim() || null } : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
          ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
          ...(parsed.data.badgeCode !== undefined ? { badgeCode: parsed.data.badgeCode.trim() } : {}),
        },
      });

      if (parsed.data.stageIds !== undefined) {
        const nextIds = new Set(parsed.data.stageIds);
        const currentIds = new Set(existing.checkIns.map((c) => c.stageId));
        const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id));
        const toAdd = Array.from(nextIds).filter((id) => !currentIds.has(id));

        if (toRemove.length) {
          await tx.checkIn.deleteMany({
            where: { guestId: params.id, stageId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.checkIn.createMany({
            data: toAdd.map((stageId) => ({
              guestId: params.id,
              stageId,
              scannedBy: "админка",
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.guest.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          checkIns: { include: { stage: true }, orderBy: { scannedAt: "asc" } },
        },
      });
    });

    return NextResponse.json(guest);
  } catch {
    return NextResponse.json({ error: "Не удалось обновить (возможно, код бейджа занят)" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.guest.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
