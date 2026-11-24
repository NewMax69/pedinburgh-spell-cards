"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  normalizeKey,
  useDriveImages,
  useSpells,
} from "@/lib/client-store";

interface DriveFile {
  id: string;
  name: string;
  url: string;
}

/** Замена иллюстраций только у этого пользователя: папка на Диске + сброс. */
export function ArtOverrides() {
  const { spells } = useSpells();
  const { map, replace, clear } = useDriveImages();
  const [folder, setFolder] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const matched = Object.keys(map).length;

  const connect = async () => {
    if (!folder.trim()) return;
    setConnecting(true);
    setInfo(null);
    try {
      const res = await fetch(`/api/drive?folder=${encodeURIComponent(folder.trim())}`);
      const data = (await res.json()) as {
        files?: DriveFile[];
        count?: number;
        folders?: number;
        truncated?: boolean;
        error?: string;
        hint?: string;
      };
      if (!res.ok || !data.files) {
        throw new Error(data.hint ? `${data.error}. ${data.hint}` : (data.error ?? "Ошибка"));
      }
      const byKey = new Map<string, string>();
      for (const spell of spells) byKey.set(normalizeKey(spell.name), spell.id);
      const next: Record<string, string> = {};
      for (const file of data.files) {
        const id = byKey.get(normalizeKey(file.name));
        if (id && !next[id]) next[id] = file.url;
      }
      replace({ ...map, ...next });
      setInfo(
        `Файлов: ${data.count ?? data.files.length} · папок: ${data.folders ?? 0} · совпадений: ${Object.keys(next).length}${data.truncated ? " · обход ограничен" : ""}`
      );
      toast.success(`Заменено иллюстраций: ${Object.keys(next).length}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <details className="mx-auto mt-12 max-w-[1440px] px-4 sm:px-5">
      <summary className="cursor-pointer select-none rounded-2xl border border-line bg-white/50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        <span className="inline-flex items-center gap-2">
          <ImagePlus className="h-3.5 w-3.5" /> Свои иллюстрации · замены только у вас
        </span>
      </summary>
      <div className="mt-2 rounded-2xl border border-line bg-white/70 p-4">
        <p className="max-w-[720px] text-[12px] leading-relaxed text-muted">
          Стандартные иллюстрации уже встроены. Здесь можно заменить любую из них своей папкой на
          Google Диске — файлы сопоставятся по имени («Огненный шар.jpg» → «Огненный шар»), вложенные
          папки обходятся автоматически. Замены хранятся только в вашем браузере.
        </p>
        <div className="mt-3 flex w-full max-w-[620px] gap-2">
          <input
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-[12.5px] outline-none focus:border-accent"
          />
          <Button onClick={connect} disabled={connecting || !folder.trim()}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Подключить
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px]">
          <span className="rounded-full bg-paper px-2.5 py-1 font-semibold text-ink-soft">
            заменено: {matched}
          </span>
          {info ? <span className="text-muted">{info}</span> : null}
          {matched > 0 ? (
            <button
              type="button"
              onClick={() => {
                clear();
                setInfo(null);
                toast.success("Иллюстрации возвращены к стандартным");
              }}
              className="font-semibold text-danger/80 hover:text-danger"
            >
              сбросить все замены
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}
