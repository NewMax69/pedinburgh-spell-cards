"use client";

import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { useSelection } from "@/lib/client-store";

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function SelectionBar({ hidden = false }: { hidden?: boolean }) {
  const { count, pages, clear } = useSelection();
  if (hidden || count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-ink/95 py-2 pl-2 pr-2 text-paper shadow-lift backdrop-blur">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-[14px] font-bold text-ink">
          {count}
        </span>
        <span className="px-1 text-[12.5px] font-semibold">
          {count} {plural(count, "карточка", "карточки", "карточек")}
          <span className="mx-1.5 text-paper/30">·</span>
          <span className="text-paper/70">
            {pages} {plural(pages, "лист", "листа", "листов")} A4
          </span>
        </span>
        <button
          type="button"
          onClick={clear}
          className="grid h-8 w-8 place-items-center rounded-lg text-paper/50 transition-colors hover:bg-white/10 hover:text-paper"
          aria-label="Очистить набор"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <Link
          href="/print"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-card px-3.5 text-[12.5px] font-bold text-ink transition-colors hover:bg-[#a8eaa6]"
        >
          К печати <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
