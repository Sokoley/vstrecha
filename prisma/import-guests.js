const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const file = path.join(__dirname, "guests-import.json");
  if (!fs.existsSync(file)) {
    throw new Error(`Файл не найден: ${file}`);
  }

  const guests = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(guests) || guests.length === 0) {
    throw new Error("Список гостей пуст");
  }

  for (const g of guests) {
    if (!g.fullName || !g.badgeCode) {
      throw new Error(`Некорректная запись: ${JSON.stringify(g)}`);
    }
  }

  const codes = guests.map((g) => g.badgeCode);
  if (new Set(codes).size !== codes.length) {
    throw new Error("В файле есть дубли кодов бейджей");
  }

  console.log(`Гостей к импорту: ${guests.length}`);

  const deletedCheckIns = await prisma.checkIn.deleteMany();
  console.log(`Удалено отметок: ${deletedCheckIns.count}`);

  const deletedGuests = await prisma.guest.deleteMany();
  console.log(`Удалено гостей: ${deletedGuests.count}`);

  const batchSize = 100;
  let created = 0;
  for (let i = 0; i < guests.length; i += batchSize) {
    const chunk = guests.slice(i, i + batchSize).map((g) => ({
      fullName: g.fullName,
      company: g.company || null,
      phone: g.phone || null,
      note: g.note || null,
      badgeCode: g.badgeCode,
    }));
    const result = await prisma.guest.createMany({ data: chunk });
    created += result.count;
  }

  const total = await prisma.guest.count();
  console.log(`Импорт завершён. Создано: ${created}. Всего в БД: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
