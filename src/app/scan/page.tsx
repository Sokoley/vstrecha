import Link from "next/link";
import { ScannerApp } from "@/components/ScannerApp";

export default function ScanPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-200/60 bg-[#f7f5ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">ВМПАВТО</p>
            <p className="text-sm font-semibold">Сканер</p>
          </div>
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-900/75 hover:bg-white"
          >
            Главная
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">
        <ScannerApp />
      </main>
    </div>
  );
}
