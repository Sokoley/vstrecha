import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const desiredStages = [
    { name: "Заезд в отель", sortOrder: 1, isActive: true },
    { name: "Экскурсия в Марьино", sortOrder: 2, isActive: true },
    { name: "Театр Лицедеи", sortOrder: 3, isActive: true },
    { name: "Конференция", sortOrder: 4, isActive: true },
    { name: "Гала-ужин", sortOrder: 5, isActive: true },
  ];

  const existingStages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
  const same =
    existingStages.length === desiredStages.length &&
    existingStages.every((s, i) => s.name === desiredStages[i].name && s.sortOrder === desiredStages[i].sortOrder);

  if (!same) {
    await prisma.checkIn.deleteMany();
    await prisma.stage.deleteMany();
    await prisma.stage.createMany({ data: desiredStages });
  }

  const guestCount = await prisma.guest.count();
  if (guestCount === 0) {
    const demoGuests = [
      { fullName: "Иванов Алексей Петрович", company: "ВМПАВТО", phone: "+7 900 111-22-33", badgeCode: "G-DEMO0001", note: "VIP" },
      { fullName: "Смирнова Мария Ивановна", company: "АвтоПлюс", phone: "+7 900 222-33-44", badgeCode: "G-DEMO0002", note: null },
      { fullName: "Козлов Дмитрий Сергеевич", company: "ТрансЛогистика", phone: null, badgeCode: "G-DEMO0003", note: "Приезд вечером" },
      { fullName: "Новикова Елена Владимировна", company: "СервисМастер", phone: "+7 900 444-55-66", badgeCode: "G-DEMO0004", note: null },
      { fullName: "Морозов Игорь Николаевич", company: "Партнёр", phone: null, badgeCode: "G-DEMO0005", note: null },
      { fullName: "Фёдорова Анна Олеговна", company: "Дилер Центр", phone: "+7 900 666-77-88", badgeCode: "G-DEMO0006", note: null },
      { fullName: "Соколов Павел Андреевич", company: "ВМПАВТО", phone: null, badgeCode: "G-DEMO0007", note: "Пресса" },
      { fullName: "Лебедева Ольга Игоревна", company: "МаркетПро", phone: "+7 900 888-99-00", badgeCode: "G-DEMO0008", note: null },
      { fullName: "Кузнецов Артём Викторович", company: "АвтоМир", phone: null, badgeCode: "G-DEMO0009", note: null },
      { fullName: "Попова Наталья Алексеевна", company: "Гость", phone: "+7 900 000-11-22", badgeCode: "G-DEMO0010", note: "Без трансфера" },
    ];
    await prisma.guest.createMany({ data: demoGuests });
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
