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

  try {
    const guest = await prisma.guest.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName.trim() } : {}),
        ...(parsed.data.company !== undefined ? { company: parsed.data.company?.trim() || null } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
        ...(parsed.data.badgeCode !== undefined ? { badgeCode: parsed.data.badgeCode.trim() } : {}),
      },
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
