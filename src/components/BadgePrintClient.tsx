"use client";

export function BadgePrintClient({ count }: { count: number }) {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()} disabled={!count}>
      Печать ({count})
    </button>
  );
}
