import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBadgeCode } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";



const guestSchema = z.object({
  fullName: z.string().min(1),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  badgeCode: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const stageId = searchParams.get("stageId");
  const status = searchParams.get("status");

  const guests = await prisma.guest.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { company: { contains: q } },
            { phone: { contains: q } },
            { badgeCode: { contains: q } },
          ],
        }
      : undefined,
    include: {
      checkIns: {
        include: { stage: true },
        orderBy: { scannedAt: "asc" },
      },
    },
    orderBy: { fullName: "asc" },
  });

  let filtered = guests;
  if (stageId && status === "passed") {
    filtered = guests.filter((g) => g.checkIns.some((c) => c.stageId === stageId));
  } else if (stageId && status === "missing") {
    filtered = guests.filter((g) => !g.checkIns.some((c) => c.stageId === stageId));
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = guestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  let badgeCode = parsed.data.badgeCode?.trim() || generateBadgeCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.guest.findUnique({ where: { badgeCode } });
    if (!exists) break;
    badgeCode = generateBadgeCode();
  }

  const guest = await prisma.guest.create({
    data: {
      fullName: parsed.data.fullName.trim(),
      company: parsed.data.company?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      note: parsed.data.note?.trim() || null,
      badgeCode,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
