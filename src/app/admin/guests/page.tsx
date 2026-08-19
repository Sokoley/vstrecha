import Link from "next/link";
import { GuestsAdmin } from "@/components/GuestsAdmin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";



type SearchParams = {
  stageId?: string;
  status?: string;
};

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [guests, stages] = await Promise.all([
    prisma.guest.findMany({
      include: { checkIns: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.stage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const stageIds = new Set(stages.map((s) => s.id));
  const initialStageId =
    searchParams.stageId && stageIds.has(searchParams.stageId) ? searchParams.stageId : "";
  const statusParam = searchParams.status;
  const initialStatus =
    statusParam === "passed" || statusParam === "missing" || statusParam === "all"
      ? statusParam
      : "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Гости</h1>
          <p className="mt-1 text-sm text-ink-900/65">Поиск, фильтры и редактирование гостей и этапов</p>
        </div>
        <Link href="/admin/badges" className="btn-primary">
          Печать QR
        </Link>
      </div>
      <GuestsAdmin
        key={`${initialStageId}-${initialStatus}`}
        initialGuests={guests.map((g) => ({
          id: g.id,
          badgeCode: g.badgeCode,
          fullName: g.fullName,
          company: g.company,
          phone: g.phone,
          note: g.note,
          checkInStageIds: g.checkIns.map((c) => c.stageId),
        }))}
        stages={stages.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive }))}
        initialStageId={initialStageId}
        initialStatus={initialStageId ? initialStatus : "all"}
      />
    </div>
  );
}
