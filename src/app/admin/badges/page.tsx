import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { BadgePrintClient } from "@/components/BadgePrintClient";

export const dynamic = "force-dynamic";

type Badge = {
  id: string;
  fullName: string;
  company: string | null;
  badgeCode: string;
  qrDataUrl: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function BadgeFace({ badge }: { badge: Badge }) {
  return (
    <article className="badge-face">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/badge-header.jpg" alt="" className="badge-face__logo" />
      <h2 className="badge-face__name">{badge.fullName}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badge.qrDataUrl} alt={`QR ${badge.badgeCode}`} className="badge-face__qr" />
      <p className="badge-face__code">{badge.badgeCode}</p>
      {badge.company ? <p className="badge-face__company">{badge.company}</p> : <span className="badge-face__company badge-face__company--empty" />}
    </article>
  );
}

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
  const sheets = chunk(badges, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title">Печать QR-бейджей</h1>
          <p className="mt-1 text-sm text-ink-900/65">
            A4, по 4 гостя на лист: сверху обычные бейджи, снизу те же — зеркально. На бейдже:
            логотип, ФИО, QR, код и компания.
          </p>
        </div>
        <BadgePrintClient count={badges.length} />
      </div>

      <div className="badge-sheets space-y-6">
        {sheets.map((sheet, sheetIndex) => (
          <section key={sheetIndex} className="badge-sheet">
            <div className="badge-sheet__half">
              {sheet.map((badge) => (
                <BadgeFace key={`top-${badge.id}`} badge={badge} />
              ))}
              {Array.from({ length: 4 - sheet.length }).map((_, i) => (
                <div key={`top-empty-${i}`} className="badge-face badge-face--empty" />
              ))}
            </div>
            <div className="badge-sheet__half badge-sheet__half--mirror">
              {sheet.map((badge) => (
                <BadgeFace key={`bottom-${badge.id}`} badge={badge} />
              ))}
              {Array.from({ length: 4 - sheet.length }).map((_, i) => (
                <div key={`bottom-empty-${i}`} className="badge-face badge-face--empty" />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!badges.length ? (
        <p className="card text-sm text-ink-900/65 print:hidden">Сначала добавьте гостей.</p>
      ) : null}
    </div>
  );
}
