import { cn } from "@/lib/utils";
import type * as React from "react";

export interface MandateBandItem {
  label: string;
  value: React.ReactNode;
}

export interface MandateBandProps {
  items: MandateBandItem[];
  title?: string;
  className?: string;
}

export function MandateBand({ items, title = "Active Investment Mandate", className }: MandateBandProps) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-xl bg-[color:var(--mvp-sidebar-bg)] text-white px-5 py-4", className)}
    >
      <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">{it.label}</p>
            <p className="text-sm font-semibold text-slate-100">{it.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
