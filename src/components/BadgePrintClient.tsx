"use client";

import { useState } from "react";

export function BadgePrintClient({ count }: { count: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function downloadPdf() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/badges/pdf");
      if (!res.ok) {
        throw new Error("Не удалось сформировать PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-badges.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка скачивания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={downloadPdf} disabled={!count || loading}>
          {loading ? "PDF…" : `Скачать PDF (${count})`}
        </button>
        <button type="button" className="btn-primary" onClick={() => window.print()} disabled={!count}>
          Печать ({count})
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
