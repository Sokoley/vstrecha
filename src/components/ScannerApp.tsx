"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/utils";

type StageOption = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type StageStatus = StageOption & {
  passed: boolean;
  checkIn: { scannedAt: string; scannedBy: string } | null;
};

type GuestPayload = {
  guest: {
    id: string;
    fullName: string;
    company: string | null;
    phone: string | null;
    note: string | null;
    badgeCode: string;
  };
  stages: StageStatus[];
};

export function ScannerApp() {
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [data, setData] = useState<GuestPayload | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesExpanded, setStagesExpanded] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });

  const selectedStage = stages.find((s) => s.id === selectedStageId) || null;
  const guestStage = data?.stages.find((s) => s.id === selectedStageId) || null;
  const canScan = Boolean(selectedStageId) && !data;
  const showStageList = stagesExpanded || !selectedStage;

  useEffect(() => {
    let cancelled = false;
    async function loadStages() {
      setStagesLoading(true);
      try {
        const res = await fetch("/api/stages");
        const json = await res.json();
        if (!res.ok || cancelled) return;
        const active = (json as StageOption[]).filter((s) => s.isActive);
        setStages(active);
      } catch {
        if (!cancelled) setError("Не удалось загрузить этапы");
      } finally {
        if (!cancelled) setStagesLoading(false);
      }
    }
    loadStages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedStageId && !data) {
      setCameraOn(true);
    }
  }, [selectedStageId, data]);

  const loadGuest = useCallback(async (code: string) => {
    const cleaned = code.trim();
    if (!cleaned) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/scan?code=${encodeURIComponent(cleaned)}`);
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(json.error || "Гость не найден");
        return;
      }
      setData(json);
      setCameraOn(false);
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraOn || !canScan || !scannerRef.current) return;
    let cancelled = false;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !scannerRef.current) return;
      const scanner = new Html5Qrcode(scannerRef.current.id);
      html5QrRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const now = Date.now();
            if (decoded === lastScanRef.current.code && now - lastScanRef.current.at < 2500) return;
            lastScanRef.current = { code: decoded, at: now };
            loadGuest(decoded);
          },
          () => undefined
        );
      } catch {
        if (!cancelled) setError("Не удалось открыть камеру. Разрешите доступ или введите код вручную.");
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = html5QrRef.current;
      html5QrRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined);
      }
    };
  }, [cameraOn, canScan, loadGuest]);

  function selectStage(stageId: string) {
    setSelectedStageId(stageId);
    setStagesExpanded(false);
    setData(null);
    setSuccess("");
    setError("");
    setManualCode("");
  }

  function scanNext() {
    setData(null);
    setSuccess("");
    setError("");
    setManualCode("");
    setCameraOn(true);
  }

  async function register() {
    if (!data || !selectedStageId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: data.guest.id, stageId: selectedStageId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Не удалось зарегистрировать");
        return;
      }
      if (json.alreadyChecked) {
        setSuccess(`Уже отмечен ранее (${formatDateTime(json.checkIn.scannedAt)})`);
      } else {
        setSuccess(json.message || "Гость зарегистрирован на этапе");
      }
      await loadGuest(data.guest.badgeCode);
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h1 className="text-xl font-semibold">Сканирование бейджа</h1>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-900/70">1. Выберите этап</p>
          {stagesLoading ? (
            <p className="text-sm text-ink-900/50">Загрузка этапов…</p>
          ) : !stages.length ? (
            <p className="text-sm text-ink-900/60">Нет активных этапов. Добавьте их в админке.</p>
          ) : showStageList ? (
            <div className="space-y-2">
              {stages.map((stage) => (
                <label
                  key={stage.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${
                    selectedStageId === stage.id
                      ? "border-brand-500 bg-brand-50/60"
                      : "border-ink-200 bg-white/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="work-stage"
                    checked={selectedStageId === stage.id}
                    onChange={() => selectStage(stage.id)}
                  />
                  <span className="font-medium">{stage.name}</span>
                </label>
              ))}
            </div>
          ) : selectedStage ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-500 bg-brand-50/60 px-3 py-3">
              <div>
                <p className="text-xs text-ink-900/50">Текущий этап</p>
                <p className="font-medium text-ink-950">{selectedStage.name}</p>
              </div>
              <button
                type="button"
                className="btn-secondary !py-1.5 shrink-0"
                onClick={() => setStagesExpanded(true)}
              >
                Сменить
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {selectedStage ? (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-900/70">2. Сканируйте гостя</p>
            {!data ? (
              <button type="button" className="btn-secondary !py-1.5" onClick={() => setCameraOn((v) => !v)}>
                {cameraOn ? "Камера выкл" : "Камера вкл"}
              </button>
            ) : null}
          </div>

          {!data && cameraOn ? (
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-black">
              <div id="qr-reader" ref={scannerRef} className="w-full" />
            </div>
          ) : null}

          {!data ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                loadGuest(manualCode);
              }}
            >
              <input
                className="input"
                placeholder="Или введите код вручную"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button className="btn-secondary shrink-0" disabled={busy}>
                Найти
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{success}</p> : null}

      {data && selectedStage ? (
        <div className="card space-y-4">
          <div>
            <p className="text-sm font-medium text-ink-900/70">3. Подтвердите регистрацию</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink-950">{data.guest.fullName}</h2>
            {data.guest.company ? <p className="mt-1 text-ink-900/70">{data.guest.company}</p> : null}
            {data.guest.phone ? <p className="text-sm text-ink-900/60">{data.guest.phone}</p> : null}
            {data.guest.note ? (
              <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-900/80">{data.guest.note}</p>
            ) : null}
            <p className="mt-2 font-mono text-xs text-ink-900/45">{data.guest.badgeCode}</p>
          </div>

          <div
            className={`rounded-xl border px-3 py-3 ${
              guestStage?.passed ? "border-brand-500 bg-brand-50/60" : "border-ink-200 bg-white/70"
            }`}
          >
            <p className="font-medium">{selectedStage.name}</p>
            <p className={`mt-0.5 text-sm ${guestStage?.passed ? "text-brand-700" : "text-ink-900/50"}`}>
              {guestStage?.passed && guestStage.checkIn
                ? `Пройден · ${formatDateTime(guestStage.checkIn.scannedAt)}`
                : "Не пройден — нажмите «Зарегистрировать»"}
            </p>
          </div>

          {data.stages.length > 1 ? (
            <details className="text-sm text-ink-900/60">
              <summary className="cursor-pointer select-none">Все этапы гостя</summary>
              <ul className="mt-2 space-y-1">
                {data.stages.map((stage) => (
                  <li key={stage.id} className="flex justify-between gap-2">
                    <span>{stage.name}</span>
                    <span className={stage.passed ? "text-brand-700" : "text-ink-900/45"}>
                      {stage.passed && stage.checkIn ? formatDateTime(stage.checkIn.scannedAt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <button
            type="button"
            className="btn-primary w-full !py-3 text-base"
            disabled={busy || Boolean(guestStage?.passed)}
            onClick={register}
          >
            Зарегистрировать
          </button>
          <button type="button" className="btn-secondary w-full" onClick={scanNext}>
            Сканировать следующего
          </button>
        </div>
      ) : null}
    </div>
  );
}
