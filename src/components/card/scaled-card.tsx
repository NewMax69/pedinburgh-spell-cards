"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CARD_H, CARD_W } from "@/lib/card-spec";
import { SpellCard } from "./spell-card";
import type { RenderOptions, Spell } from "@/lib/types";
import { cn } from "@/lib/cn";

const PX_PER_PT = 96 / 72;
const BASE_W = CARD_W * PX_PER_PT;
const BASE_H = CARD_H * PX_PER_PT;

export function ScaledCard({
  spell,
  options,
  className,
  onClick,
}: {
  spell: Spell;
  options?: RenderOptions;
  className?: string;
  onClick?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = host.current;
    if (el) setWidth(el.getBoundingClientRect().width);
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / BASE_W : 0;

  return (
    <div
      ref={host}
      className={cn("relative w-full", className)}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
      onClick={onClick}
    >
      {scale > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SpellCard spell={spell} options={options} />
        </div>
      )}
    </div>
  );
}

export function FixedCard({
  spell,
  options,
  scale = 1,
  className,
}: {
  spell: Spell;
  options?: RenderOptions;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ width: BASE_W * scale, height: BASE_H * scale, flex: "none" }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: BASE_W, height: BASE_H }}>
        <SpellCard spell={spell} options={options} />
      </div>
    </div>
  );
}
