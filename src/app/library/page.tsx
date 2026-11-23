"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CloudDownload, Download, ImagePlus, Loader2, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ScaledCard } from "@/components/card/scaled-card";
import { Button } from "@/components/ui/button";
import {
  applyDriveImages,
  emptySpell,
  normalizeKey,
  useCustomCards,
  useDriveImages,
  useSelection,
  useSpells,
} from "@/lib/client-store";
import { levelText } from "@/lib/client-store";
import { normalizeSchool } from "@/lib/schools";
import type { Spell } from "@/lib/types";

interface DriveFile {
  id: string;
  name: string;
  url: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { cards, upsert, remove, replaceAll } = useCustomCards();
  const { spells } = useSpells();
  const { map: driveMap, replace: replaceDrive, clear: clearDrive } = useDriveImages();
  const selection = useSelection();

  const [folder, setFolder] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [driveInfo, setDriveInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const matched = useMemo(() => Object.keys(driveMap).length, [driveMap]);

  const connectDrive = async () => {
    if (!folder.trim()) return;
    setConnecting(true);
    setDriveInfo(null);
    try {
      const res = await fetch(`/api/drive?folder=${encodeURIComponent(folder.trim())}`);
      const data = (await res.json()) as {
        files?: DriveFile[];
        count?: number;
        folders?: number;
        truncated?: boolean;
        error?: string;
        hint?: string;
        mode?: string;
      };
      if (!res.ok || !data.files) {
        throw new Error(data.hint ? `${data.error}. ${data.hint}` : (data.error ?? "Ошибка"));
      }
      const byKey = new Map<string, string>();
      for (const spell of spells) {
        byKey.set(normalizeKey(spell.name), spell.id);
        if (spell.altName) byKey.set(normalizeKey(spell.altName), spell.id);
      }
      const next: Record<string, string> = {};
      for (const file of data.files) {
        const id = byKey.get(normalizeKey(file.name));
        if (id && !next[id]) next[id] = file.url;
      }
      // не затираем ранее подключённые папки — только дополняем
      replaceDrive({ ...driveMap, ...next });
      setDriveInfo(
        `Файлов: ${data.count ?? data.files.length} · папок: ${data.folders ?? 0} · новых совпадений: ${Object.keys(next).length}${data.truncated ? " · обход ограничен" : ""}`
      );
      toast.success(`Сопоставлено ${Object.keys(next).length} иллюстраций`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(cards, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pedinburgh-custom-cards.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Spell[];
      if (!Array.isArray(parsed)) throw new Error("ожидался массив карточек");
      for (const card of parsed) upsert({ ...card, custom: true });
      toast.success(`Импортировано карточек: ${parsed.length}`);
    } catch (error) {
      toast.error(`Не удалось импортировать: ${(error as Error).message}`);
    }
  };

  const create = () => {
    const card = emptySpell();
    upsert(card);
    router.push(`/editor?id=${encodeURIComponent(card.id)}`);
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-5">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportJson} disabled={!cards.length}>
              <Download className="h-4 w-4" /> Экспорт
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Импорт
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => importJson(event.target.files?.[0])}
            />
            <Button onClick={create}>
              <Plus className="h-4 w-4" /> Новая карточка
            </Button>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-line bg-white/70 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-[620px]">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                <ImagePlus className="h-3.5 w-3.5" /> Иллюстрации из Google Диска
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Вставьте ссылку на папку — можно с любыми вложенными папками, обойдём все. Файлы
                сопоставятся по имени: «Огненный шар.jpg» → карточка «Огненный шар». Подходят jpg, png, webp.
              </p>
            </div>
            <div className="flex w-full max-w-[520px] gap-2">
              <input
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-[12.5px] outline-none focus:border-accent"
              />
              <Button onClick={connectDrive} disabled={connecting || !folder.trim()}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Подключить
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px]">
            <span className="rounded-full bg-paper px-2.5 py-1 font-semibold text-ink-soft">
              сопоставлено: {matched}
            </span>
            {driveInfo ? <span className="text-muted">{driveInfo}</span> : null}
            {matched > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearDrive();
                  setDriveInfo(null);
                  toast.success("Привязки иллюстраций сброшены");
                }}
                className="font-semibold text-danger/80 hover:text-danger"
              >
                сбросить
              </button>
            ) : null}
            <span className="ml-auto text-muted">
              Каталог: {applyDriveImages(spells, driveMap).filter((s) => s.image).length} карточек с картинкой
            </span>
          </div>
        </section>

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-ink">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-[26px] font-bold">Пока ни одной своей карточки</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
              Создайте карточку с нуля или откройте любое заклинание в каталоге и нажмите «Своя версия».
            </p>
            <Button className="mt-5" size="lg" onClick={create}>
              Создать карточку
            </Button>
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

        <section className="mt-10 rounded-2xl border border-line bg-white/50 p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            <CloudDownload className="h-3.5 w-3.5" /> как это работает
          </p>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted">
            Свои карточки и привязки иллюстраций хранятся локально в браузере. «Экспорт» сохраняет их в
            JSON — этот файл можно перенести на другой компьютер и загрузить через «Импорт».
          </p>
        </section>
      </main>
    </div>
  );
}
