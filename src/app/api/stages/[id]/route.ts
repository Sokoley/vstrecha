import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";



const stageSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  const parsed = stageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const stage = await prisma.stage.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  });

  return NextResponse.json(stage);
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.stage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
