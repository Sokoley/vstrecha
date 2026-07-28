import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { generateBadgeCode } from "@/lib/auth";

export const dynamic = "force-dynamic";



function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.trim().toLowerCase() === key.toLowerCase());
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return "";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    return NextResponse.json({ error: "Ошибка разбора CSV", details: parsed.errors.slice(0, 3) }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const fullName = pick(row, ["fullName", "ФИО", "фио", "name", "имя", "гость"]);
    if (!fullName) {
      skipped++;
      continue;
    }
    const company = pick(row, ["company", "компания", "организация"]) || null;
    const phone = pick(row, ["phone", "телефон", "тел"]) || null;
    const note = pick(row, ["note", "заметка", "комментарий"]) || null;
    let badgeCode = pick(row, ["badgeCode", "код", "qr", "badge"]);
    if (!badgeCode) badgeCode = generateBadgeCode();

    try {
      await prisma.guest.create({
        data: { fullName, company, phone, note, badgeCode },
      });
      created++;
    } catch {
      // retry with new code if duplicate badge
      try {
        await prisma.guest.create({
          data: { fullName, company, phone, note, badgeCode: generateBadgeCode() },
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ created, skipped, total: parsed.data.length });
}
