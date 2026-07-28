"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/utils";

type StageStatus = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
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
  const [manualCode, setManualCode] = useState("");
  const [data, setData] = useState<GuestPayload | null>(null);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });

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
      const firstOpen = json.stages.find((s: StageStatus) => !s.passed);
      setSelectedStageId(firstOpen?.id || json.stages[0]?.id || "");
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraOn || !scannerRef.current) return;
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
  }, [cameraOn, loadGuest]);

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
        setSuccess("Регистрация прошла успешно");
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
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Сканирование бейджа</h1>
          <button type="button" className="btn-secondary !py-1.5" onClick={() => setCameraOn((v) => !v)}>
            {cameraOn ? "Камера выкл" : "Камера вкл"}
          </button>
        </div>
        {cameraOn ? (
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-black">
            <div id="qr-reader" ref={scannerRef} className="w-full" />
          </div>
        ) : null}
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
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{success}</p> : null}

      {data ? (
        <div className="card space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink-950">{data.guest.fullName}</h2>
            {data.guest.company ? <p className="mt-1 text-ink-900/70">{data.guest.company}</p> : null}
            {data.guest.phone ? <p className="text-sm text-ink-900/60">{data.guest.phone}</p> : null}
            {data.guest.note ? (
              <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-900/80">{data.guest.note}</p>
            ) : null}
            <p className="mt-2 font-mono text-xs text-ink-900/45">{data.guest.badgeCode}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-900/70">Этапы</p>
            {data.stages.map((stage) => (
              <label
                key={stage.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                  selectedStageId === stage.id ? "border-brand-500 bg-brand-50/60" : "border-ink-200 bg-white/70"
                }`}
              >
                <input
                  type="radio"
                  name="stage"
                  className="mt-1"
                  checked={selectedStageId === stage.id}
                  onChange={() => setSelectedStageId(stage.id)}
                />
                <span className="flex-1">
                  <span className="block font-medium">{stage.name}</span>
                  <span className={`mt-0.5 block text-sm ${stage.passed ? "text-brand-700" : "text-ink-900/50"}`}>
                    {stage.passed && stage.checkIn
                      ? `Пройден · ${formatDateTime(stage.checkIn.scannedAt)}`
                      : "Не пройден"}
                  </span>
                </span>
              </label>
            ))}
            {!data.stages.length ? (
              <p className="text-sm text-ink-900/60">Нет активных этапов. Добавьте их в админке.</p>
            ) : null}
          </div>

          <button type="button" className="btn-primary w-full !py-3 text-base" disabled={busy || !selectedStageId} onClick={register}>
            Регистрация
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setData(null);
              setSuccess("");
              setError("");
              setManualCode("");
            }}
          >
            Сканировать следующего
          </button>
        </div>
      ) : null}
    </div>
  );
}
