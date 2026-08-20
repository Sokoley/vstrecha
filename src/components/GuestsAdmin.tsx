"use client";

import { useMemo, useState, type FormEvent } from "react";

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

type EditForm = {
  fullName: string;
  company: string;
  phone: string;
  note: string;
  badgeCode: string;
  stageIds: string[];
};

type CreateForm = {
  fullName: string;
  company: string;
  phone: string;
  note: string;
};

function emptyForm(): EditForm {
  return {
    fullName: "",
    company: "",
    phone: "",
    note: "",
    badgeCode: "",
    stageIds: [],
  };
}

function emptyCreateForm(): CreateForm {
  return {
    fullName: "",
    company: "",
    phone: "",
    note: "",
  };
}

function formFromGuest(guest: GuestRow): EditForm {
  return {
    fullName: guest.fullName,
    company: guest.company || "",
    phone: guest.phone || "",
    note: guest.note || "",
    badgeCode: guest.badgeCode,
    stageIds: [...guest.checkInStageIds],
  };
}

function toGuestRow(json: {
  id: string;
  badgeCode: string;
  fullName: string;
  company: string | null;
  phone: string | null;
  note: string | null;
  checkIns?: { stageId: string }[];
}): GuestRow {
  return {
    id: json.id,
    badgeCode: json.badgeCode,
    fullName: json.fullName,
    company: json.company,
    phone: json.phone,
    note: json.note,
    checkInStageIds: (json.checkIns || []).map((c) => c.stageId),
  };
}

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
  const [guests, setGuests] = useState(initialGuests);
  const [q, setQ] = useState("");
  const [stageId, setStageId] = useState(initialStageId);
  const [status, setStatus] = useState<"all" | "passed" | "missing">(initialStatus);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [listError, setListError] = useState("");

  const editingGuest = editingId ? guests.find((g) => g.id === editingId) || null : null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return guests.filter((g) => {
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
  }, [guests, q, stageId, status]);

  function openEdit(guest: GuestRow) {
    setEditingId(guest.id);
    setForm(formFromGuest(guest));
    setError("");
    setSuccess("");
    setShowCreate(false);
    setPendingDeleteId(null);
  }

  function closeEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setSuccess("");
  }

  function openCreate() {
    setShowCreate(true);
    setCreateForm(emptyCreateForm());
    setCreateError("");
    setCreateSuccess("");
    setEditingId(null);
    setPendingDeleteId(null);
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateForm(emptyCreateForm());
    setCreateError("");
    setCreateSuccess("");
  }

  function toggleStage(stageIdToToggle: string) {
    setForm((prev) => {
      const has = prev.stageIds.includes(stageIdToToggle);
      return {
        ...prev,
        stageIds: has
          ? prev.stageIds.filter((id) => id !== stageIdToToggle)
          : [...prev.stageIds, stageIdToToggle],
      };
    });
  }

  async function createGuest(e: FormEvent) {
    e.preventDefault();
    if (!createForm.fullName.trim()) {
      setCreateError("Укажите ФИО");
      return;
    }
    setBusy(true);
    setCreateError("");
    setCreateSuccess("");
    setListError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: createForm.fullName.trim(),
          company: createForm.company.trim() || null,
          phone: createForm.phone.trim() || null,
          note: createForm.note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Не удалось добавить гостя");
        return;
      }
      const next = toGuestRow(json);
      setGuests((prev) => [...prev, next].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")));
      setCreateForm(emptyCreateForm());
      setCreateSuccess(`Добавлен: ${next.fullName} · ${next.badgeCode}`);
    } catch {
      setCreateError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  async function saveGuest(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/guests/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: form.note.trim() || null,
          stageIds: form.stageIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить");
        return;
      }
      const next = toGuestRow(json);
      setGuests((prev) => prev.map((g) => (g.id === next.id ? next : g)));
      setForm(formFromGuest(next));
      setSuccess("Сохранено");
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGuest(id: string) {
    setBusy(true);
    setListError("");
    try {
      const res = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(json.error || "Не удалось удалить");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) closeEdit();
      setPendingDeleteId(null);
    } catch {
      setListError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  function stageNames(ids: string[]) {
    if (!ids.length) return "—";
    const names = stages.filter((s) => ids.includes(s.id)).map((s) => s.name);
    return names.length ? names.join(", ") : String(ids.length);
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid flex-1 gap-3 md:grid-cols-3 min-w-[16rem]">
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
          <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
            Добавить гостя
          </button>
        </div>

        <p className="text-sm text-ink-900/60">Показано: {filtered.length}</p>
        {listError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink-200 text-ink-900/60">
              <tr>
                <th className="px-2 py-2 font-medium">ФИО</th>
                <th className="px-2 py-2 font-medium">Код</th>
                <th className="px-2 py-2 font-medium">Компания</th>
                <th className="px-2 py-2 font-medium">Этапы</th>
                <th className="px-2 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b border-ink-200/60">
                  <td className="px-2 py-2 font-medium">{g.fullName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{g.badgeCode}</td>
                  <td className="px-2 py-2">{g.company || "—"}</td>
                  <td className="px-2 py-2 max-w-[16rem]">
                    <span className="line-clamp-2" title={stageNames(g.checkInStageIds)}>
                      {stageNames(g.checkInStageIds)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button type="button" className="btn-secondary !py-1.5" onClick={() => openEdit(g)}>
                        Изменить
                      </button>
                      {pendingDeleteId === g.id ? (
                        <>
                          <button
                            type="button"
                            className="btn-danger !py-1.5"
                            disabled={busy}
                            onClick={() => deleteGuest(g.id)}
                          >
                            Подтвердить
                          </button>
                          <button
                            type="button"
                            className="btn-secondary !py-1.5"
                            disabled={busy}
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary !py-1.5 text-red-700"
                          onClick={() => {
                            setPendingDeleteId(g.id);
                            setListError("");
                          }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Новый гость</h2>
              <p className="mt-1 text-sm text-ink-900/60">Код бейджа создаётся автоматически</p>
            </div>
            <button type="button" className="btn-secondary !py-1.5" onClick={closeCreate}>
              Закрыть
            </button>
          </div>

          <form className="space-y-4" onSubmit={createGuest}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-ink-900/70">ФИО</span>
                <input
                  className="input"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink-900/70">Компания</span>
                <input
                  className="input"
                  value={createForm.company}
                  onChange={(e) => setCreateForm((f) => ({ ...f, company: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink-900/70">Телефон</span>
                <input
                  className="input"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-ink-900/70">Заметка</span>
                <textarea
                  className="input min-h-[5rem]"
                  value={createForm.note}
                  onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
                />
              </label>
            </div>

            {createError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{createError}</p>
            ) : null}
            {createSuccess ? (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{createSuccess}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Добавление…" : "Добавить"}
              </button>
              <button type="button" className="btn-secondary" onClick={closeCreate} disabled={busy}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editingGuest ? (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Редактирование гостя</h2>
              <p className="mt-1 text-sm text-ink-900/60">{editingGuest.fullName}</p>
            </div>
            <button type="button" className="btn-secondary !py-1.5" onClick={closeEdit}>
              Закрыть
            </button>
          </div>

          <form className="space-y-4" onSubmit={saveGuest}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink-900/70">ФИО</p>
                <p className="rounded-xl border border-ink-200/60 bg-ink-50/50 px-3 py-2.5 text-sm">
                  {editingGuest.fullName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink-900/70">Код бейджа</p>
                <p className="rounded-xl border border-ink-200/60 bg-ink-50/50 px-3 py-2.5 font-mono text-sm">
                  {editingGuest.badgeCode}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink-900/70">Компания</p>
                <p className="rounded-xl border border-ink-200/60 bg-ink-50/50 px-3 py-2.5 text-sm">
                  {editingGuest.company || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink-900/70">Телефон</p>
                <p className="rounded-xl border border-ink-200/60 bg-ink-50/50 px-3 py-2.5 text-sm">
                  {editingGuest.phone || "—"}
                </p>
              </div>
              <label className="block space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-ink-900/70">Заметка</span>
                <textarea
                  className="input min-h-[5rem]"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-900/70">Пройденные этапы</p>
              {!stages.length ? (
                <p className="text-sm text-ink-900/60">Нет этапов</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {stages.map((stage) => {
                    const checked = form.stageIds.includes(stage.id);
                    return (
                      <label
                        key={stage.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${
                          checked ? "border-brand-500 bg-brand-50/60" : "border-ink-200 bg-white/70"
                        } ${stage.isActive ? "" : "opacity-70"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStage(stage.id)}
                        />
                        <span className="flex-1">
                          <span className="block font-medium">{stage.name}</span>
                          {!stage.isActive ? (
                            <span className="text-xs text-ink-900/45">неактивный</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {success ? (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{success}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Сохранение…" : "Сохранить"}
              </button>
              <button type="button" className="btn-secondary" onClick={closeEdit} disabled={busy}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
