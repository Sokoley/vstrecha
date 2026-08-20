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
  nameLine1: string;
  nameLine2: string;
};

function titleWord(word: string) {
  if (!word) return "";
  return word.charAt(0).toLocaleUpperCase("ru-RU") + word.slice(1).toLocaleLowerCase("ru-RU");
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nameLine1: "", nameLine2: "" };
  if (parts.length === 1) return { nameLine1: titleWord(parts[0]), nameLine2: "" };
  return {
    nameLine1: titleWord(parts[0]),
    nameLine2: parts.slice(1).map(titleWord).join(" "),
  };
}

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
      <img src="/badge-header.png" alt="" className="badge-face__logo" />
      <div className="badge-face__name">
        <span>{badge.nameLine1}</span>
        {badge.nameLine2 ? <span>{badge.nameLine2}</span> : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badge.qrDataUrl} alt={`QR ${badge.badgeCode}`} className="badge-face__qr" />
      <p className="badge-face__code">{badge.badgeCode}</p>
      <p className={`badge-face__company ${badge.company ? "" : "badge-face__company--empty"}`}>
        {badge.company || "\u00a0"}
      </p>
    </article>
  );
}

export default async function BadgesPage() {
  const guests = await prisma.guest.findMany({ orderBy: { fullName: "asc" } });
  const badges = await Promise.all(
    guests.map(async (guest) => {
      const name = splitName(guest.fullName);
      return {
        id: guest.id,
        fullName: guest.fullName,
        company: guest.company,
        badgeCode: guest.badgeCode,
        qrDataUrl: await generateQrDataUrl(guest.badgeCode, 280),
        ...name,
      };
    })
  );
  const sheets = chunk(badges, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title">Печать QR-бейджей</h1>
          <p className="mt-1 text-sm text-ink-900/65">
            A4 альбомная, бейдж 60×90 mm, 4 гостя на лист с зеркалом. Логотип 17×17,4 mm, QR 28×28
            mm.
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
