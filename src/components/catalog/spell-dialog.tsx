"use client";

import { useEffect } from "react";
import { Check, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { FixedCard } from "@/components/card/scaled-card";
import { Button } from "@/components/ui/button";
import { SCHOOL_META, normalizeSchool } from "@/lib/schools";
import { levelText } from "@/lib/client-store";
import type { Spell } from "@/lib/types";

export function SpellDialog({
  spell,
  open,
  selected,
  onClose,
  onToggle,
  onEdit,
}: {
  spell: Spell | null;
  open: boolean;
  selected: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onEdit?: (spell: Spell) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !spell) return null;

  const school = normalizeSchool(spell.school);
  const meta = school ? SCHOOL_META[school] : null;
  const paragraphs = [spell.art, ...spell.body, spell.upgrade].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-6">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={spell.name}
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-paper shadow-lift sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/80 bg-paper/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">
              {levelText(spell.level)}
              {school ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-line-strong" />
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: meta?.color }} />
                    {school}
                  </span>
                </>
              ) : null}
              {spell.ritual ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-line-strong" />
                  Ритуал
                </>
              ) : null}
            </p>
            <h2 className="mt-0.5 truncate font-display text-[24px] font-bold leading-tight">{spell.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:text-ink"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[292px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <FixedCard spell={spell} scale={1.12} className="shadow-lift" />
            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={() => onToggle(spell.id)}
                variant={selected ? "secondary" : "primary"}
                className="w-full"
              >
                {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {selected ? "В наборе" : "В набор"}
              </Button>
              {onEdit ? (
                <Button variant="secondary" className="w-full" onClick={() => onEdit(spell)}>
                  <Pencil className="h-4 w-4" /> Своя версия
                </Button>
              ) : null}
              {spell.source ? (
                <a
                  href={spell.source}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-ink"
                >
                  Источник <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line pb-4 text-[12.5px]">
              {[
                ["Накладывание", spell.casting],
                ["Дистанция", spell.range],
                ["Длительность", spell.duration],
                ["Компоненты", spell.components],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
                  <dd className="font-display text-[15px] italic">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 space-y-3 font-display text-[15px] leading-[1.45] text-ink-soft">
              {paragraphs.map((text, index) => (
                <p key={index} className={index === 0 ? "text-[16px] italic text-ink" : undefined}>
                  {text}
                </p>
              ))}
            </div>

            <p className="mt-5 border-t border-line pt-3 text-[11px] text-muted">
              {spell.custom
                ? "Своя карточка · хранится в браузере"
                : spell.status === "edited"
                  ? "Авторское описание из базы Пединбурга"
                  : "Черновик: описание ещё не адаптировано"}
            </p>

            {spell.official && spell.status === "edited" ? (
              <details open className="mt-3 rounded-xl border border-line bg-white/60 px-3 py-2.5">
                <summary className="cursor-pointer select-none text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  Официальное описание
                </summary>
                <p className="mt-2 whitespace-pre-line font-display text-[14px] leading-[1.45] text-ink-soft">
                  {spell.official}
                </p>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
