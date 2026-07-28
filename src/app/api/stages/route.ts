import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";



const stageSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(stages);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = stageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const max = await prisma.stage.aggregate({ _max: { sortOrder: true } });
  const stage = await prisma.stage.create({
    data: {
      name: parsed.data.name.trim(),
      sortOrder: parsed.data.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json(stage, { status: 201 });
}
