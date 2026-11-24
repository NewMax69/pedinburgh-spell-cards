"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, GripVertical, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { SheetPreview } from "@/components/print/sheet-preview";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/chip";
import { applyDriveImages, useCustomCards, useDriveImages, useSelection, useSpells } from "@/lib/client-store";
import { levelText } from "@/lib/client-store";
import { normalizeSchool } from "@/lib/schools";
import type { Spell } from "@/lib/types";

function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export default function PrintPage() {
  const { spells } = useSpells();
  const { cards: customCards } = useCustomCards();
  const { map: driveMap } = useDriveImages();
  const { ids, count, remove, clear, reorder } = useSelection();

  const [cutMarks, setCutMarks] = useState(true);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const dragFrom = useRef<number | null>(null);

  const byId = useMemo(() => {
    const map = new Map<string, Spell>();
    for (const spell of applyDriveImages(spells, driveMap)) map.set(spell.id, spell);
    for (const card of customCards) map.set(card.id, card);
    return map;
  }, [spells, customCards, driveMap]);

  const selected = useMemo(
    () => ids.map((id) => byId.get(id)).filter((spell): spell is Spell => !!spell),
    [ids, byId]
  );

  const pages = useMemo(() => {
    const result: (Spell | null)[][] = [];
    for (let i = 0; i < selected.length; i += 9) {
      const page: (Spell | null)[] = selected.slice(i, i + 9);
      while (page.length < 9) page.push(null);
      result.push(page);
    }
    return result.length ? result : [[]];
  }, [selected]);

  const totalPages = Math.max(1, Math.ceil(selected.length / 9));

  const onDownload = async () => {
    if (!selected.length) return;
    setExporting(true);
    setProgress({ done: 0, total: totalPages });
    try {
      const { downloadPdf } = await import("@/lib/pdf");
      const url = await downloadPdf(selected, {
        cutMarks,
        pageNumbers,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (url) setPdfUrl(url);

      toast.success(`PDF готов — ${totalPages} ${plural(totalPages, "лист", "листа", "листов")}`, {
        action: url ? { label: "Открыть", onClick: () => window.open(url, "_blank") } : undefined,
        duration: 8000,
      });
    } catch (error) {
      toast.error(`Не удалось собрать PDF: ${(error as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> в каталог
            </Link>
            <h1 className="font-display text-[34px] font-bold leading-none tracking-[-0.02em]">Печать</h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              {selected.length
                ? `${selected.length} ${plural(selected.length, "карточка", "карточки", "карточек")} · ${totalPages} ${plural(totalPages, "лист", "листа", "листов")} A4 · 3 × 3`
                : "Набор пуст"}
            </p>
          </div>
          {selected.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={clear}>
                <Trash2 className="h-4 w-4" /> Очистить
              </Button>
            </div>
          ) : null}
        </div>

        {pdfUrl ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-accent-deep">PDF готов</p>
              <p className="text-[11px] text-accent-deep/70">
                {totalPages} {plural(totalPages, "лист", "листа", "листов")} · кнопки ниже
              </p>
            </div>
          </div>
        ) : null}

        {selected.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-ink">
              <FileText className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-[26px] font-bold">В наборе пока пусто</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
              Откройте каталог и добавляйте карточки кнопкой «+» — или добавьте сразу весь круг кнопкой
              «весь круг» в заголовке. Порядок сохраняется и станет порядком карточек на листах.
            </p>
            <Link href="/" className="mt-5 inline-block">
              <Button size="lg">Перейти в каталог</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
            <div className="space-y-6">
              {pages.map((page, index) => (
                <section key={index}>
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                      Лист {index + 1} из {pages.length}
                    </h2>
                    <span className="text-[11.5px] text-muted">
                      перетаскивайте карточки, чтобы поменять порядок
                    </span>
                  </div>
                  <SheetPreview
                    spells={page}
                    pageIndex={index}
                    cutMarks={cutMarks}
                    pageNumbers={pageNumbers}
                    totalPages={totalPages}
                    onReorder={reorder}
                    className="shadow-tile"
                  />
                </section>
              ))}
            </div>

            <aside className="h-fit lg:sticky lg:top-20">
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Настройки печати</p>
                <div className="mt-2 divide-y divide-line/70">
                  <Switch
                    checked={cutMarks}
                    onChange={setCutMarks}
                    label="Линии реза"
                    hint="Тонкие линии на весь лист"
                  />
                  <Switch
                    checked={pageNumbers}
                    onChange={setPageNumbers}
                    label="Номера листов"
                    hint="Внизу страницы, 8 pt"
                  />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-paper/70 p-3 text-[11.5px]">
                  <div>
                    <dt className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted">Карточка</dt>
                    <dd className="font-semibold">63,5 × 88,9 мм</dd>
                  </div>
                  <div>
                    <dt className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted">Лист</dt>
                    <dd className="font-semibold">A4 · 9 шт.</dd>
                  </div>
                </dl>

                <Button className="mt-4 w-full" size="lg" onClick={onDownload} disabled={exporting}>
                  <Download className="h-4 w-4" />
                  {exporting
                    ? `Собираем ${progress.done}/${progress.total}…`
                    : `Скачать PDF · ${totalPages} ${plural(totalPages, "лист", "листа", "листов")}`}
                </Button>
                {exporting ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${Math.max(4, (progress.done / Math.max(1, progress.total)) * 100)}%` }}
                    />
                  </div>
                ) : null}
                {pdfUrl ? (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center justify-center gap-1 text-[11.5px] font-semibold text-accent hover:underline"
                  >
                    Открыть PDF <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mt-2 text-center text-[10.5px] leading-snug text-muted">
                    PDF с векторным текстом и иллюстрациями, готов к печати без полей.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-line bg-white/70">
                <div className="flex items-center justify-between border-b border-line/70 px-4 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Порядок · {count}</p>
                  <Link href="/" className="text-[11px] font-semibold text-accent hover:underline">
                    добавить
                  </Link>
                </div>
                <ul className="max-h-[420px] overflow-y-auto p-1.5">
                  {selected.map((spell, index) => {
                    const school = normalizeSchool(spell.school);
                    return (
                      <li
                        key={spell.id}
                        draggable
                        onDragStart={(event) => {
                          dragFrom.current = index;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from = Number(event.dataTransfer.getData("text/plain"));
                          if (Number.isFinite(from) && dragFrom.current !== null) reorder(from, index);
                          dragFrom.current = null;
                        }}
                        className="group flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-paper active:cursor-grabbing"
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-line-strong" />
                        <input
                          type="number"
                          min={1}
                          max={count}
                          key={`${spell.id}-${index}`}
                          defaultValue={index + 1}
                          onBlur={(event) => {
                            const target = Number(event.target.value);
                            if (Number.isFinite(target) && target >= 1 && target <= count) {
                              reorder(index, target - 1);
                            } else {
                              event.target.value = String(index + 1);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                          }}
                          aria-label="Порядковый номер"
                          className="h-6 w-9 shrink-0 rounded border border-line bg-white text-center font-mono text-[10.5px] outline-none focus:border-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold">{spell.name}</span>
                          <span className="block truncate text-[10px] text-muted">
                            {levelText(spell.level)} · {school ?? "—"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(spell.id)}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                          aria-label="Убрать"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
