"use client";

import { useMemo, useState } from "react";

type Stage = { id: string; name: string; isActive: boolean };
type GuestRow = {
  id: string;
  badgeCode: string;
  fullName: string;
  company: string | null;
  phone: string | null;
  note: string | null;
  checkInStageIds: string[];
};

export function GuestsAdmin({
  initialGuests,
  stages,
  initialStageId = "",
  initialStatus = "all",
}: {
  initialGuests: GuestRow[];
  stages: Stage[];
  initialStageId?: string;
  initialStatus?: "all" | "passed" | "missing";
}) {
  const [q, setQ] = useState("");
  const [stageId, setStageId] = useState(initialStageId);
  const [status, setStatus] = useState<"all" | "passed" | "missing">(initialStatus);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialGuests.filter((g) => {
      const matchesQuery =
        !query ||
        g.fullName.toLowerCase().includes(query) ||
        (g.company || "").toLowerCase().includes(query) ||
        (g.phone || "").toLowerCase().includes(query) ||
        g.badgeCode.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (!stageId || status === "all") return true;
      const passed = g.checkInStageIds.includes(stageId);
      return status === "passed" ? passed : !passed;
    });
  }, [initialGuests, q, stageId, status]);

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="input"
            placeholder="Поиск по имени, компании, коду…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">Все этапы</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "passed" | "missing")}
            disabled={!stageId}
          >
            <option value="all">Без фильтра статуса</option>
            <option value="passed">Прошли этап</option>
            <option value="missing">Не прошли этап</option>
          </select>
        </div>

        <p className="text-sm text-ink-900/60">Показано: {filtered.length}</p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink-200 text-ink-900/60">
              <tr>
                <th className="px-2 py-2 font-medium">ФИО</th>
                <th className="px-2 py-2 font-medium">Код</th>
                <th className="px-2 py-2 font-medium">Компания</th>
                <th className="px-2 py-2 font-medium">Этапы</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-ink-200/60">
                  <td className="px-2 py-2 font-medium">{g.fullName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{g.badgeCode}</td>
                  <td className="px-2 py-2">{g.company || "—"}</td>
                  <td className="px-2 py-2">{g.checkInStageIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
