"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  ChevronDown,
  Layers,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CardTile } from "@/components/catalog/card-tile";
import { SelectionBar } from "@/components/catalog/selection-bar";
import { SpellDialog } from "@/components/catalog/spell-dialog";
import { Button } from "@/components/ui/button";
import {
  applyDriveImages,
  useCustomCards,
  useDriveImages,
  useSelection,
  useSpells,
} from "@/lib/client-store";
import { SCHOOLS, SCHOOL_META } from "@/lib/schools";
import { cn } from "@/lib/cn";
import type { Spell } from "@/lib/types";

type SortKey = "level" | "name" | "school";

const LEVELS = Array.from({ length: 10 }, (_, value) => value);

function groupTitle(level: number) {
  return level === 0 ? "Заговоры" : `${level} круг`;
}

export default function CatalogView({ initialSpells }: { initialSpells: Spell[] }) {
  const router = useRouter();
  const { spells, loading, error, refresh, source } = useSpells(initialSpells);
  const { cards: customCards, upsert } = useCustomCards();
  const { map: driveMap } = useDriveImages();
  const selection = useSelection();

  const [levels, setLevels] = useState<number[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [ritualOnly, setRitualOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("level");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [detail, setDetail] = useState<Spell | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLDivElement>(null);

  const all = useMemo(
    () => [...customCards, ...applyDriveImages(spells, driveMap)],
    [customCards, spells, driveMap]
  );

  const counts = useMemo(() => {
    const byLevel = new Map<number, number>();
    for (const spell of all) byLevel.set(spell.level, (byLevel.get(spell.level) ?? 0) + 1);
    return { byLevel };
  }, [all]);

  const adapted = useMemo(
    () => all.filter((spell) => spell.custom || spell.status === "edited"),
    [all]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = all.filter((spell) => {
      if (levels.length > 0 && !levels.includes(spell.level)) return false;
      if (schools.length > 0 && !schools.includes(spell.school)) return false;
      if (ritualOnly && !spell.ritual) return false;
      if (onlyEdited && spell.status !== "edited" && !spell.custom) return false;
      if (!needle) return true;
      return (
        spell.name.toLowerCase().includes(needle) ||
        (spell.altName ?? "").toLowerCase().includes(needle) ||
        spell.school.toLowerCase().includes(needle) ||
        spell.components.toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ru");
      if (sort === "school") return a.school.localeCompare(b.school, "ru") || a.name.localeCompare(b.name, "ru");
      return a.level - b.level || a.name.localeCompare(b.name, "ru");
    });
  }, [all, levels, schools, ritualOnly, onlyEdited, query, sort]);

  const groups = useMemo(() => {
    const map = new Map<number, Spell[]>();
    for (const spell of filtered) {
      const list = map.get(spell.level);
      if (list) list.push(spell);
      else map.set(spell.level, [spell]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (event.key === "/" && tag !== "input" && tag !== "textarea" && tag !== "select") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!bulkOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!bulkRef.current?.contains(event.target as Node)) setBulkOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [bulkOpen]);

  const openEditor = (spell: Spell) => {
    if (spell.custom) {
      router.push(`/editor?id=${encodeURIComponent(spell.id)}`);
      return;
    }
    const copy: Spell = {
      ...spell,
      id: `custom-${Math.random().toString(36).slice(2, 10)}`,
      custom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsert(copy);
    router.push(`/editor?id=${encodeURIComponent(copy.id)}`);
  };

  const toggleLevel = (value: number) =>
    setLevels((prev) => (prev.includes(value) ? prev.filter((level) => level !== value) : [...prev, value]));

  const toggleSchool = (name: string) =>
    setSchools((prev) => (prev.includes(name) ? prev.filter((school) => school !== name) : [...prev, name]));

  const hasFilters = levels.length > 0 || schools.length > 0 || ritualOnly || onlyEdited || query.trim().length > 0;

  const resetFilters = () => {
    setLevels([]);
    setSchools([]);
    setRitualOnly(false);
    setQuery("");
    setOnlyEdited(false);
  };

  const bulkAdd = (list: Spell[], close = true) => {
    selection.addMany(list.map((spell) => spell.id));
    if (close) setBulkOpen(false);
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <section className="relative overflow-hidden border-b border-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 90% at 15% 0%, rgba(185,243,183,0.5), transparent 70%), radial-gradient(40% 70% at 90% 10%, rgba(40,98,74,0.12), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1440px] px-4 pb-6 pt-8 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/70 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-deep">
                <Sparkles className="h-3 w-3" /> База Пединбурга · 10 кругов · 8 школ
              </p>
              <h1 className="font-display text-[clamp(30px,4vw,46px)] font-bold leading-[0.95] tracking-[-0.02em]">
                Карты заклинаний
              </h1>
              <p className="mt-2 text-[12.5px] text-muted">
                {all.length} карточек
                <span className="mx-1.5 text-line-strong">·</span>
                {adapted.length} с авторским описанием
                <span className="mx-1.5 text-line-strong">·</span>
                печать A4 по 9 штук
              </p>
            </div>

            <div className="flex w-full max-w-[430px] flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Найти заклинание, школу, компонент…"
                  className="h-11 w-full rounded-xl border border-line-strong bg-white/85 pl-9 pr-16 text-[13.5px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:bg-white"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-ink/5"
                    aria-label="Очистить поиск"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    /
                  </kbd>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 text-[10.5px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      source === "google" ? "bg-accent" : source === "local" ? "bg-[#d19a2f]" : "bg-muted"
                    )}
                  />
                  {source === "google" ? "Данные из Google Таблицы" : source === "local" ? "Локальный кэш" : "Загрузка…"}
                </span>
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center gap-1 font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  <RotateCw className={cn("h-3 w-3", loading && "animate-spin")} /> Обновить
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setLevels([])}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                levels.length === 0
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong bg-white/60 text-ink-soft hover:border-ink/30 hover:bg-white"
              )}
            >
              Все
              <span className={cn("text-[10.5px]", levels.length === 0 ? "text-paper/60" : "text-muted")}>
                {all.length}
              </span>
            </button>
            {LEVELS.map((value) => {
              const active = levels.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleLevel(value)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-line-strong bg-white/60 text-ink-soft hover:border-ink/30 hover:bg-white"
                  )}
                >
                  {value === 0 ? "Заговоры" : `${value} круг`}
                  <span className={cn("text-[10.5px]", active ? "text-white/70" : "text-muted")}>
                    {counts.byLevel.get(value) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {SCHOOLS.map((name) => {
              const active = schools.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSchool(name)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-accent-deep"
                      : "border-line bg-white/50 text-ink-soft hover:border-line-strong hover:bg-white"
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: SCHOOL_META[name].color }} />
                  {name}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setRitualOnly((value) => !value)}
              aria-pressed={ritualOnly}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors",
                ritualOnly
                  ? "border-[#24478f] bg-[#e6eefc] text-[#24478f]"
                  : "border-line bg-white/50 text-ink-soft hover:border-line-strong hover:bg-white"
              )}
            >
              <span className="grid h-3.5 w-3.5 place-items-center rounded-[3px] bg-[#24478f]/10 text-[9px] font-bold text-[#24478f]">
                Р
              </span>
              Ритуал
            </button>

            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={onlyEdited}
                onChange={(event) => setOnlyEdited(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#28624A]"
              />
              <CheckCheck className="h-3.5 w-3.5" /> только адаптированные
            </label>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative" ref={bulkRef}>
                <button
                  type="button"
                  onClick={() => setBulkOpen((value) => !value)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Добавить всё
                  <ChevronDown className="h-3 w-3" />
                </button>
                {bulkOpen ? (
                  <div className="absolute right-0 top-9 z-40 w-[268px] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift">
                    <button
                      type="button"
                      onClick={() => bulkAdd(filtered)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold hover:bg-paper"
                    >
                      По текущим фильтрам
                      <span className="text-[11px] text-muted">{filtered.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkAdd(adapted)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold hover:bg-paper"
                    >
                      Все адаптированные
                      <span className="text-[11px] text-muted">{adapted.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkAdd(all)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold hover:bg-paper"
                    >
                      Все карточки
                      <span className="text-[11px] text-muted">{all.length}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-8 rounded-lg border border-line bg-white/70 px-2 text-[11.5px] font-semibold outline-none"
                >
                  <option value="level">По кругу</option>
                  <option value="name">По названию</option>
                  <option value="school">По школе</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-5 sm:px-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[12px] font-semibold text-muted">
            {loading && !spells.length ? "Загружаем заклинания…" : `${filtered.length} карточек в ${groups.length} ${groups.length === 1 ? "круге" : "кругах"}`}
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink-soft hover:bg-ink/10"
              >
                <X className="h-3 w-3" /> сбросить
              </button>
            ) : null}
          </p>
        </div>

        {error && !spells.length ? (
          <div className="rounded-2xl border border-line bg-white/70 p-8 text-center">
            <p className="font-display text-[22px] font-bold">Не удалось загрузить базу</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] text-muted">{error}</p>
            <Button className="mt-4" onClick={refresh}>
              <RotateCw className="h-4 w-4" /> Повторить
            </Button>
          </div>
        ) : null}

        {loading && !spells.length ? (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="skeleton aspect-[5/7] rounded-[12px]" />
                <div className="mt-2 h-3 w-2/3 rounded bg-line" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map(([level, list]) => (
              <section key={level} aria-label={groupTitle(level)}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line/80 pb-2">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="font-display text-[26px] font-bold leading-none tracking-[-0.01em]">
                      {groupTitle(level)}
                    </h2>
                    <span className="text-[11.5px] font-semibold text-muted">{list.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selection.addMany(list.map((spell) => spell.id))}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-line-strong bg-white px-2 text-[11px] font-semibold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
                  >
                    <Plus className="h-3 w-3" /> весь круг
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {list.map((spell) => (
                    <CardTile
                      key={spell.id}
                      spell={spell}
                      selected={selection.has(spell.id)}
                      onToggle={selection.toggle}
                      onOpen={() => setDetail(spell)}
                      onEdit={openEditor}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-white/40 p-12 text-center">
            <p className="font-display text-[22px] font-bold">Ничего не найдено</p>
            <p className="mt-1 text-[12.5px] text-muted">Попробуйте другой запрос или сбросьте фильтры.</p>
          </div>
        ) : null}
      </main>

      <SelectionBar />
      <SpellDialog
        spell={detail}
        open={!!detail}
        selected={detail ? selection.has(detail.id) : false}
        onClose={() => setDetail(null)}
        onToggle={selection.toggle}
        onEdit={openEditor}
      />
    </div>
  );
}
