import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { BadgePrintClient } from "@/components/BadgePrintClient";

export const dynamic = "force-dynamic";



export default async function BadgesPage() {
  const guests = await prisma.guest.findMany({ orderBy: { fullName: "asc" } });
  const badges = await Promise.all(
    guests.map(async (guest) => ({
      id: guest.id,
      fullName: guest.fullName,
      company: guest.company,
      badgeCode: guest.badgeCode,
      qrDataUrl: await generateQrDataUrl(guest.badgeCode, 220),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title">Печать QR-бейджей</h1>
          <p className="mt-1 text-sm text-ink-900/65">
            На бейдже: имя, компания и QR с кодом гостя. Можно скачать PDF или распечатать из браузера.
          </p>
        </div>
        <BadgePrintClient count={badges.length} />
      </div>

      <div className="badge-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3">
        {badges.map((badge) => (
          <article
            key={badge.id}
            className="badge-card flex flex-col items-center rounded-2xl border border-ink-200 bg-white p-4 text-center shadow-sm print:break-inside-avoid print:rounded-none print:border print:shadow-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badge.qrDataUrl} alt={`QR ${badge.badgeCode}`} className="h-40 w-40" />
            <h2 className="mt-3 text-base font-semibold leading-tight text-ink-950">{badge.fullName}</h2>
            {badge.company ? <p className="mt-1 text-sm text-ink-900/65">{badge.company}</p> : null}
            <p className="mt-2 font-mono text-xs text-ink-900/50">{badge.badgeCode}</p>
          </article>
        ))}
      </div>

      {!badges.length ? (
        <p className="card text-sm text-ink-900/65 print:hidden">Сначала добавьте гостей.</p>
      ) : null}
    </div>
  );
}
