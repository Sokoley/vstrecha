import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";



export default async function AdminHomePage() {
  const [guestCount, stages, recent] = await Promise.all([
    prisma.guest.count(),
    prisma.stage.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { checkIns: true } } },
    }),
    prisma.checkIn.findMany({
      take: 20,
      orderBy: { scannedAt: "desc" },
      include: { guest: true, stage: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Обзор</h1>
        <p className="mt-1 text-sm text-ink-900/65">Прохождение этапов и последние отметки</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/scan" className="btn-primary !px-6 !py-3 text-base">
          Сканер
        </Link>
        <Link href="/admin/guests" className="btn-secondary !px-6 !py-3 text-base">
          Гости
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-950">По этапам</h2>
        {!stages.length ? (
          <p className="card text-sm text-ink-900/65">Этапов пока нет.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stages.map((stage) => {
              const passed = stage._count.checkIns;
              const percent = guestCount ? Math.round((passed / guestCount) * 100) : 0;
              return (
                <div key={stage.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-ink-950">{stage.name}</h3>
                      <p className="text-sm text-ink-900/60">
                        {passed} из {guestCount} · {percent}%
                        {!stage.isActive ? " · выключен" : ""}
                      </p>
                    </div>
                    <Link
                      href={`/admin/guests?stageId=${stage.id}&status=missing`}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Список
                    </Link>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Последние отметки</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink-200 text-ink-900/60">
              <tr>
                <th className="px-2 py-2 font-medium">Время</th>
                <th className="px-2 py-2 font-medium">Гость</th>
                <th className="px-2 py-2 font-medium">Этап</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-b border-ink-200/50">
                  <td className="whitespace-nowrap px-2 py-2">{formatDateTime(item.scannedAt)}</td>
                  <td className="px-2 py-2">{item.guest.fullName}</td>
                  <td className="px-2 py-2">{item.stage.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recent.length ? <p className="py-4 text-sm text-ink-900/60">Отметок пока нет</p> : null}
        </div>
      </section>
    </div>
  );
}
