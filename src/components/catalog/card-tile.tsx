"use client";

import Link from "next/link";
import { Check, Eye, Plus } from "lucide-react";
import { LazyCard } from "@/components/catalog/lazy-card";
import { SCHOOL_META, normalizeSchool } from "@/lib/schools";
import { cn } from "@/lib/cn";
import type { Spell } from "@/lib/types";

interface Props {
  spell: Spell;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (spell: Spell) => void;
  onEdit?: (spell: Spell) => void;
}

export function CardTile({ spell, selected, onToggle, onOpen, onEdit }: Props) {
  const school = normalizeSchool(spell.school);
  const meta = school ? SCHOOL_META[school] : null;

  return (
    <article className="group relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-[12px] border bg-white transition-all duration-200",
          selected
            ? "border-accent shadow-[0_0_0_2px_rgba(40,98,74,0.25),0_18px_36px_-18px_rgba(23,22,18,0.4)]"
            : "border-line shadow-tile hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
        )}
      >
        <button
          type="button"
          onClick={() => onOpen(spell)}
          className="block w-full cursor-pointer text-left"
          aria-label={`Открыть ${spell.name}`}
        >
          <LazyCard spell={spell} />
        </button>

        <button
          type="button"
          onClick={() => onToggle(spell.id)}
          aria-pressed={selected}
          aria-label={selected ? "Убрать из набора" : "Добавить в набор"}
          className={cn(
            "absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border transition-all",
            selected
              ? "border-accent bg-accent text-white"
              : "border-black/10 bg-white/85 text-ink-soft opacity-0 backdrop-blur group-hover:opacity-100 hover:bg-white"
          )}
        >
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="pointer-events-none inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink">
            <Eye className="h-3 w-3" /> Подробнее
          </span>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(spell)}
              className="pointer-events-auto rounded-md bg-white/90 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-white"
            >
              Изменить
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {meta ? (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
          ) : null}
          <span className="truncate text-[11.5px] font-medium text-muted">
            {school ?? "Школа не указана"}
          </span>
          {spell.ritual ? (
            <span className="rounded bg-[#e6eefc] px-1 text-[9.5px] font-bold uppercase tracking-wide text-[#24478f]">
              ритуал
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-bold uppercase tracking-[0.08em]",
            spell.status === "edited"
              ? "text-accent"
              : spell.status === "failed"
                ? "text-danger/70"
                : "text-muted/70"
          )}
          title={
            spell.status === "edited"
              ? "Авторское описание"
              : spell.status === "failed"
                ? "Не прошло редактуру"
                : "Черновик"
          }
        >
          {spell.custom ? "своя" : spell.status === "edited" ? "адапт." : spell.status === "failed" ? "черновик" : "—"}
        </span>
      </div>
    </article>
  );
}
