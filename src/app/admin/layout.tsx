import { AdminHeaderAction } from "@/components/AdminHeaderAction";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-200/60 bg-[#f7f5ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">ВМПАВТО</p>
            <p className="text-sm font-semibold text-ink-950">Регистрация гостей</p>
          </div>
          <AdminHeaderAction />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
