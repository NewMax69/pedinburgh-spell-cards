"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  ImageDown,
  ImagePlus,
  Layers,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ScaledCard } from "@/components/card/scaled-card";
import { SpellCard } from "@/components/card/spell-card";
import { saveCardPng } from "@/lib/png";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/chip";
import { emptySpell, useCustomCards, useSelection, useUnits } from "@/lib/client-store";
import { toFeet, toMeters } from "@/lib/units";
import { SCHOOLS } from "@/lib/schools";
import { DEFAULT_THEME, type CardTheme, type Spell } from "@/lib/types";
import { getCardLayout } from "@/lib/card-layout";
import { fontsReady } from "@/lib/measure";
import { compressImage } from "@/lib/idb";
import { cn } from "@/lib/cn";
import {
  CASTING_OPTIONS,
  DURATION_OPTIONS,
  KEYWORDS,
  RANGE_OPTIONS,
  UPGRADE_KEYWORDS,
  buildComponents,
  parseComponents,
} from "@/lib/spell-options";

const FIELD =
  "h-9 w-full rounded-lg border border-line-strong bg-white px-2.5 text-[13px] outline-none transition-colors focus:border-accent";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1 block">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{children}</span>
      {hint ? <span className="ml-1 normal-case tracking-normal text-muted/70">· {hint}</span> : null}
    </span>
  );
}

const THEMES: { name: string; theme: CardTheme }[] = [
  { name: "Классика", theme: { ...DEFAULT_THEME } },
  { name: "Изумруд", theme: { header: "#CDEFC9", accent: "#79C077", ink: "#101A12", paper: "#FFFFFF" } },
  { name: "Пергамент", theme: { header: "#EFDFC0", accent: "#C9A96A", ink: "#2A2013", paper: "#FBF5E8" } },
  { name: "Ночь", theme: { header: "#2B3B57", accent: "#8FB4E8", ink: "#F2F5FA", paper: "#1B2433" } },
  { name: "Пепел", theme: { header: "#DEDCD6", accent: "#A9A49A", ink: "#1A1917", paper: "#F7F6F3" } },
];

const splitBody = (value: string) =>
  value
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim() !== "");

function TextTools({
  inputRef,
  value,
  onChange,
  keywords = [],
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  keywords?: string[];
}) {
  const apply = (wrap: string | null, insert: string | null) => {
    const element = inputRef.current;
    if (!element) return;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    let next = value;
    let selStart = start;
    let selEnd = end;
    if (wrap) {
      const selected = value.slice(start, end) || "текст";
      next = value.slice(0, start) + wrap + selected + wrap + value.slice(end);
      selStart = start + wrap.length;
      selEnd = selStart + selected.length;
    } else if (insert) {
      next = value.slice(0, start) + insert + value.slice(end);
      selStart = start + insert.length;
      selEnd = selStart;
    }
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(selStart, selEnd);
    });
  };

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => apply("**", null)}
        title="Жирный: **текст**"
        className="grid h-7 w-7 place-items-center rounded border border-line-strong bg-white text-[12px] font-bold transition-colors hover:border-ink/30"
      >
        Ж
      </button>
      <button
        type="button"
        onClick={() => apply("*", null)}
        title="Курсив: *текст*"
        className="grid h-7 w-7 place-items-center rounded border border-line-strong bg-white text-[12px] italic transition-colors hover:border-ink/30"
      >
        К
      </button>
      {keywords.length ? (
        <>
          <span className="mx-1 h-4 w-px bg-line" />
          {keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => apply(null, keyword)}
              className="h-7 rounded border border-line bg-white px-2 text-[11px] font-semibold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
            >
              {keyword.replace(": ", "")}
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}

export default function EditorPage() {
  const router = useRouter();
  const { cards, upsert, remove } = useCustomCards();
  const selection = useSelection();
  const { units, setUnits } = useUnits();

  const [draft, setDraft] = useState<Spell | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const artRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const upgradeRef = useRef<HTMLTextAreaElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const onSavePng = async () => {
    const node = exportRef.current?.querySelector<HTMLElement>(".spell-card");
    if (!node || !draft) return;
    setBusy(true);
    try {
      await saveCardPng(node, draft.name);
      toast.success("PNG сохранён");
    } catch (error) {
      toast.error(`Не удалось сохранить PNG: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (draft) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      const found = cards.find((card) => card.id === id);
      if (found) {
        setDraft(found);
        setImageUrl(found.image && /^https?:/.test(found.image) ? found.image : "");
        return;
      }
      // стор мог ещё не прочитать localStorage — даём ему мгновение
      const timer = setTimeout(() => {
        setDraft((prev) => prev ?? emptySpell());
      }, 350);
      return () => clearTimeout(timer);
    }
    setDraft(emptySpell());
  }, [cards, draft]);

  const update = useCallback((patch: Partial<Spell>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }, []);

  const components = parseComponents(draft?.components ?? "");
  const setComponentPart = (key: "v" | "s" | "m" | "material", value: boolean | string) => {
    update({ components: buildComponents({ ...components, [key]: value }) });
  };

  const text = useMemo(() => {
    if (!draft) return { art: "", body: "", upgrade: "" };
    return { art: draft.art, body: draft.body.join("\n\n"), upgrade: draft.upgrade };
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    let alive = true;
    fontsReady().then(() => {
      if (!alive) return;
      const layout = getCardLayout(draft, {
        showArt: draft.showArt,
        showUpgrade: draft.showUpgrade,
        showComponents: draft.showComponents,
        artInHeader: draft.artInHeader,
      });
      setOverflow(layout.overflow);
    });
    return () => {
      alive = false;
    };
  }, [draft]);

  const save = useCallback(
    (silent = false) => {
      if (!draft) return;
      if (!draft.name.trim()) {
        toast.error("У карточки должно быть название");
        return;
      }
      upsert(draft);
      setDirty(false);
      if (!silent) toast.success("Карточка сохранена");
    },
    [draft, upsert]
  );

  const saveAndAdd = () => {
    if (!draft) return;
    upsert(draft);
    selection.add(draft.id);
    toast.success("Сохранено и добавлено в набор");
    router.push("/print");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await compressImage(file);
      update({ image: data });
      toast.success("Иллюстрация загружена");
    } catch (error) {
      toast.error(`Не удалось обработать файл: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const applyImageUrl = () => {
    const value = imageUrl.trim();
    if (!value) {
      update({ image: undefined });
      return;
    }
    const proxied =
      /^https?:/.test(value) && /drive\.google\.com|googleusercontent\.com/.test(value)
        ? `/api/image?src=${encodeURIComponent(value)}`
        : value;
    update({ image: proxied });
    toast.success("Ссылка на иллюстрацию сохранена");
  };

  const onDownloadOne = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const { downloadPdf } = await import("@/lib/pdf");
      await downloadPdf([draft]);
      toast.success("PDF карточки готов");
    } catch (error) {
      toast.error(`Ошибка PDF: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <div className="min-h-dvh">
        <AppHeader />
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const theme = { ...DEFAULT_THEME, ...(draft.theme ?? {}) };
  const isExisting = cards.some((card) => card.id === draft.id);

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/library"
              className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> мои карточки
            </Link>
            <h1 className="font-display text-[34px] font-bold leading-none tracking-[-0.02em]">
              {isExisting ? "Редактор карточки" : "Новая карточка"}
            </h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              Меняйте любой компонент — превью справа обновляется сразу.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isExisting ? (
              <Button
                variant="danger"
                onClick={() => {
                  remove(draft.id);
                  toast.success("Карточка удалена");
                  router.push("/library");
                }}
              >
                <Trash2 className="h-4 w-4" /> Удалить
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onDownloadOne} disabled={busy}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button variant="secondary" onClick={onSavePng} disabled={busy}>
              <ImageDown className="h-4 w-4" /> PNG
            </Button>
            <Button variant="secondary" onClick={() => save()}>
              <Save className="h-4 w-4" /> Сохранить
            </Button>
            <Button onClick={saveAndAdd}>
              <Layers className="h-4 w-4" /> Сохранить и в набор
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_376px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Основное</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <Label>Название</Label>
                  <input
                    className={FIELD}
                    value={draft.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </label>
                <label>
                  <Label>Круг</Label>
                  <select
                    className={FIELD}
                    value={draft.level}
                    onChange={(event) => update({ level: Number(event.target.value) })}
                  >
                    {Array.from({ length: 10 }, (_, value) => (
                      <option key={value} value={value}>
                        {value === 0 ? "Заговор" : `${value} круг`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <Label>Школа</Label>
                  <select
                    className={FIELD}
                    value={draft.school}
                    onChange={(event) => update({ school: event.target.value })}
                  >
                    {SCHOOLS.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <Switch
                    checked={draft.ritual}
                    onChange={(value) => update({ ritual: value })}
                    label="Ритуал"
                    hint="Добавит маленький бейдж «Р» у уровня"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Накладывание · дистанция · длительность
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <Label>Накладывание</Label>
                  <select
                    className={FIELD}
                    value={draft.casting}
                    onChange={(event) => update({ casting: event.target.value })}
                  >
                    {!CASTING_OPTIONS.includes(draft.casting) && draft.casting ? (
                      <option value={draft.casting}>{draft.casting}</option>
                    ) : null}
                    {CASTING_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="flex items-center justify-between">
                    <Label>Дистанция</Label>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        if (!draft) return;
                        const next = units === "m" ? "ft" : "m";
                        setUnits(next);
                        update({ range: next === "ft" ? toFeet(draft.range) : toMeters(draft.range) });
                      }}
                      className="mb-1 text-[10.5px] font-bold text-accent hover:underline"
                    >
                      {units === "m" ? "метры" : "футы"}
                    </button>
                  </span>
                  <select
                    className={FIELD}
                    value={draft.range}
                    onChange={(event) => update({ range: event.target.value })}
                  >
                    {!RANGE_OPTIONS.includes(draft.range) && draft.range ? (
                      <option value={draft.range}>{draft.range}</option>
                    ) : null}
                    {RANGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <Label>Длительность</Label>
                  <select
                    className={FIELD}
                    value={draft.duration}
                    onChange={(event) => update({ duration: event.target.value })}
                  >
                    {!DURATION_OPTIONS.includes(draft.duration) && draft.duration ? (
                      <option value={draft.duration}>{draft.duration}</option>
                    ) : null}
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-3">
                  <Label hint="отметьте нужные">Компоненты</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ["v", "В — вербальный"],
                        ["s", "С — соматический"],
                        ["m", "М — материальный"],
                      ] as const
                    ).map(([key, label]) => {
                      const active = components[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setComponentPart(key, !active)}
                          className={cn(
                            "h-8 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors",
                            active
                              ? "border-accent bg-accent-soft text-accent-deep"
                              : "border-line-strong bg-white text-ink-soft hover:border-ink/25"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                    {components.m ? (
                      <input
                        className={cn(FIELD, "h-8 max-w-[300px] flex-1")}
                        placeholder="что нужно для М (необязательно)"
                        value={components.material}
                        onChange={(event) => setComponentPart("material", event.target.value)}
                      />
                    ) : null}
                    <span className="text-[11px] text-muted">на карточке: {draft.components || "—"}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Текст</p>
              <div className="space-y-4">
                <div>
                  <Label>Художественное описание</Label>
                  <TextTools
                    inputRef={artRef}
                    value={text.art}
                    onChange={(value) => update({ art: value })}
                  />
                  <textarea
                    ref={artRef}
                    className={cn(FIELD, "h-20 resize-y py-2")}
                    value={text.art}
                    onChange={(event) => update({ art: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Описание механик</Label>
                  <TextTools
                    inputRef={bodyRef}
                    value={text.body}
                    onChange={(value) => update({ body: splitBody(value) })}
                    keywords={KEYWORDS}
                  />
                  <textarea
                    ref={bodyRef}
                    className={cn(FIELD, "h-40 resize-y py-2 leading-relaxed")}
                    value={text.body}
                    onChange={(event) => update({ body: splitBody(event.target.value) })}
                  />
                </div>
                <div>
                  <Label hint="необязательно">Улучшение заклинания</Label>
                  <TextTools
                    inputRef={upgradeRef}
                    value={text.upgrade}
                    onChange={(value) => update({ upgrade: value })}
                    keywords={UPGRADE_KEYWORDS}
                  />
                  <textarea
                    ref={upgradeRef}
                    className={cn(FIELD, "h-16 resize-y py-2")}
                    value={text.upgrade}
                    onChange={(event) => update({ upgrade: event.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Иллюстрация</p>
              <div className="flex flex-wrap items-start gap-3">
                <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-line bg-paper">
                  {draft.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-muted">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                  )}
                </div>
                <div className="min-w-[200px] flex-1 space-y-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-white px-3 text-[12.5px] font-semibold transition-colors hover:border-ink/25">
                    <Upload className="h-4 w-4" />
                    {busy ? "Обработка…" : "Загрузить файл"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onFile(event.target.files?.[0])}
                    />
                  </label>
                  <div className="flex gap-2">
                    <input
                      className={FIELD}
                      placeholder="https://drive.google.com/file/d/…"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                    />
                    <Button variant="secondary" size="sm" className="h-9" onClick={applyImageUrl}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => update({ image: undefined })}
                      className="text-[11.5px] font-semibold text-muted hover:text-danger"
                    >
                      Убрать иллюстрацию
                    </button>
                    <span className="text-[10.5px] text-muted/70">
                      без картинки нарисуем арканную заглушку
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Оформление</p>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => update({ theme: preset.theme })}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                      theme.header === preset.theme.header
                        ? "border-accent bg-accent-soft text-accent-deep"
                        : "border-line-strong bg-white hover:border-ink/25"
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded border border-black/10"
                      style={{ background: preset.theme.header }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Шапка", "header"],
                    ["Бумага", "paper"],
                    ["Текст", "ink"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme[key]}
                      onChange={(event) => {
                        const value = event.target.value;
                        const follows = theme.accent.toLowerCase() === theme.header.toLowerCase();
                        update({
                          theme: {
                            ...theme,
                            [key]: value,
                            ...(key === "header" && follows ? { accent: value } : {}),
                          } as CardTheme,
                        });
                      }}
                      className="h-8 w-9 cursor-pointer rounded border border-line bg-white p-0.5"
                    />
                    <span className="text-[11.5px] font-semibold text-ink-soft">{label}</span>
                  </label>
                ))}
                {theme.accent.toLowerCase() !== theme.header.toLowerCase() ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accent}
                      onChange={(event) =>
                        update({ theme: { ...theme, accent: event.target.value } as CardTheme })
                      }
                      className="h-8 w-9 cursor-pointer rounded border border-line bg-white p-0.5"
                    />
                    <span className="text-[11.5px] font-semibold text-ink-soft">Акцент</span>
                  </label>
                ) : null}
              </div>

              <div className="mt-3 divide-y divide-line/60">
                <Switch
                  checked={theme.accent.toLowerCase() === theme.header.toLowerCase()}
                  onChange={(value) =>
                    update({
                      theme: value
                        ? ({ ...theme, accent: theme.header } as CardTheme)
                        : ({ ...theme, accent: "#8FD48C" } as CardTheme),
                    })
                  }
                  label="Акцент как у шапки"
                  hint="Выключите, чтобы задать отдельный цвет"
                />
                <Switch
                  checked={draft.showArt !== false}
                  onChange={(value) => update({ showArt: value })}
                  label="Художественное описание"
                />
                <Switch
                  checked={draft.showUpgrade !== false}
                  onChange={(value) => update({ showUpgrade: value })}
                  label="Блок улучшения"
                />
                <Switch
                  checked={draft.showComponents !== false}
                  onChange={(value) => update({ showComponents: value })}
                  label="Строка компонентов"
                />
                <Switch
                  checked={!!draft.artInHeader}
                  onChange={(value) => update({ artInHeader: value })}
                  label="Вместо компонентов — художественное описание"
                />
              </div>
            </section>
          </div>

          <aside className="h-fit lg:sticky lg:top-20">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Превью</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                    overflow ? "bg-[#fbeed6] text-[#8a5a12]" : "bg-accent-soft text-accent-deep"
                  )}
                >
                  {overflow ? "текст обрезан" : "помещается"}
                </span>
              </div>
              <div className="mx-auto w-full max-w-[324px]">
                <ScaledCard spell={draft} className="shadow-lift" />
              </div>
              <p className="mt-3 text-center text-[10.5px] text-muted">
                63,5 × 88,9 мм · кегль подбирается автоматически
              </p>
              {dirty ? (
                <p className="mt-3 rounded-lg bg-[#fbeed6] px-2.5 py-1.5 text-center text-[11px] font-semibold text-[#8a5a12]">
                  Есть несохранённые изменения
                </p>
              ) : (
                <p className="mt-3 inline-flex w-full items-center justify-center gap-1 text-[11px] text-muted">
                  <Sparkles className="h-3 w-3" /> всё сохранено
                </p>
              )}
            </div>
          </aside>
        </div>
      {draft ? (
        <div
          ref={exportRef}
          aria-hidden
          style={{ position: "fixed", left: "-10000px", top: 0, pointerEvents: "none" }}
        >
          <SpellCard spell={draft} />
        </div>
      ) : null}
      </main>
    </div>
  );
}
