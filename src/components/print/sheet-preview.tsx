"use client";

import { useEffect, useRef, useState } from "react";
import { A4, CARD_H, CARD_W } from "@/lib/card-spec";
import { SpellCard } from "@/components/card/spell-card";
import type { Spell } from "@/lib/types";
import { cn } from "@/lib/cn";

const PX_PER_PT = 96 / 72;
const SHEET_W = A4.w * PX_PER_PT;
const SHEET_H = A4.h * PX_PER_PT;
const START_X = ((A4.w - CARD_W * 3) / 2) * PX_PER_PT;
const START_Y = ((A4.h - CARD_H * 3) / 2) * PX_PER_PT;
const CARD_PX_W = CARD_W * PX_PER_PT;
const CARD_PX_H = CARD_H * PX_PER_PT;

export function SheetPreview({
  spells,
  pageIndex,
  cutMarks = true,
  pageNumbers = false,
  totalPages = 1,
  onReorder,
  className,
}: {
  spells: (Spell | null)[];
  pageIndex: number;
  cutMarks?: boolean;
  pageNumbers?: boolean;
  totalPages?: number;
  onReorder?: (from: number, to: number) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [over, setOver] = useState<number | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / SHEET_W : 0;
  const base = pageIndex * 9;

  const slotFromEvent = (event: React.DragEvent) => {
    const el = host.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const s = rect.width / SHEET_W;
    const x = (event.clientX - rect.left) / s;
    const y = (event.clientY - rect.top) / s;
    const col = Math.floor((x - START_X) / CARD_PX_W);
    const row = Math.floor((y - START_Y) / CARD_PX_H);
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    return row * 3 + col;
  };

  return (
    <div
      ref={host}
      className={cn("relative w-full overflow-hidden rounded-lg border border-line bg-white", className)}
      style={{ aspectRatio: `${A4.w} / ${A4.h}` }}
      onDragOver={(event) => {
        if (!onReorder) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const slot = slotFromEvent(event);
        setOver(slot === null ? null : base + slot);
      }}
      onDragLeave={(event) => {
        if (!host.current?.contains(event.relatedTarget as Node)) setOver(null);
      }}
      onDrop={(event) => {
        if (!onReorder) return;
        event.preventDefault();
        const slot = slotFromEvent(event);
        const from = Number(event.dataTransfer.getData("text/plain"));
        setOver(null);
        if (slot !== null && Number.isFinite(from)) onReorder(from, base + slot);
      }}
    >
      {scale > 0 && (
        <div
          style={{
            width: SHEET_W,
            height: SHEET_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
            background: "#fff",
          }}
        >
          {spells.map((spell, slot) => {
            const col = slot % 3;
            const row = Math.floor(slot / 3);
            const left = START_X + col * CARD_PX_W;
            const top = START_Y + row * CARD_PX_H;
            const index = base + slot;
            return (
              <div
                key={slot}
                draggable={!!spell && !!onReorder}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(index));
                  event.dataTransfer.effectAllowed = "move";
                }}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: CARD_PX_W,
                  height: CARD_PX_H,
                  outline: over === index ? "2px solid #28624A" : undefined,
                  outlineOffset: -1,
                  cursor: spell ? "grab" : "default",
                }}
              >
                {spell ? (
                  <SpellCard spell={spell} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center border border-dashed border-line bg-paper/40">
                    <span className="text-[11px] font-semibold text-muted/60">{index + 1}</span>
                  </div>
                )}
              </div>
            );
          })}

          {cutMarks && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={`v${i}`}
                  style={{
                    position: "absolute",
                    left: START_X + i * CARD_PX_W - 0.4,
                    top: 0,
                    width: 0.8,
                    height: SHEET_H,
                    background: "#dcdcdc",
                  }}
                />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={`h${i}`}
                  style={{
                    position: "absolute",
                    top: START_Y + i * CARD_PX_H - 0.4,
                    left: 0,
                    height: 0.8,
                    width: SHEET_W,
                    background: "#dcdcdc",
                  }}
                />
              ))}
            </>
          )}

          {pageNumbers && (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 10 * PX_PER_PT,
                width: "100%",
                textAlign: "center",
                fontSize: 8 * PX_PER_PT,
                color: "#9a9a9a",
                fontFamily: "Alegreya Sans, serif",
              }}
            >
              {pageIndex + 1} / {totalPages}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
