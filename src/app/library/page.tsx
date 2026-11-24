"use client";

import Link from "next/link";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ScaledCard } from "@/components/card/scaled-card";
import { levelText, useCustomCards, useSelection } from "@/lib/client-store";
import { normalizeSchool } from "@/lib/schools";

export default function LibraryPage() {
  const { cards, remove } = useCustomCards();
  const selection = useSelection();

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-5">
        <div className="mb-6">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
            личная коллекция
          </p>
          <h1 className="font-display text-[34px] font-bold leading-none tracking-[-0.02em]">
            Мои карточки
          </h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {cards.length} {cards.length === 1 ? "карточка" : "карточек"} · хранятся в браузере
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-ink">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-[26px] font-bold">Пока ни одной своей карточки</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
              Нажмите «Создать» в шапке или откройте любое заклинание в каталоге и выберите «Своя
              версия».
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {cards.map((card) => {
              const school = normalizeSchool(card.school);
              const selected = selection.has(card.id);
              return (
                <article key={card.id} className="group">
                  <Link
                    href={`/editor?id=${encodeURIComponent(card.id)}`}
                    className="block overflow-hidden rounded-[12px] border border-line bg-white shadow-tile transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <ScaledCard spell={card} />
                  </Link>
                  <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                    <span className="truncate text-[11.5px] text-muted">
                      {levelText(card.level)} · {school ?? "—"}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => selection.toggle(card.id)}
                        className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-ink/5 hover:text-ink"
                        aria-label="В набор"
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          remove(card.id);
                          toast.success("Карточка удалена");
                        }}
                        className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
