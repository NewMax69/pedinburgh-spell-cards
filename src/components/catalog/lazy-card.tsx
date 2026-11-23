"use client";

import { useEffect, useRef, useState } from "react";
import { ScaledCard } from "@/components/card/scaled-card";
import type { Spell } from "@/lib/types";

/**
 * Монтирует карточку только когда она подходит к области просмотра.
 * Позволяет держать в каталоге все 388 карточек без «Показать ещё».
 */
export function LazyCard({ spell }: { spell: Spell }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="relative w-full" style={{ aspectRatio: "180 / 252" }}>
      {visible ? (
        <ScaledCard spell={spell} />
      ) : (
        <div className="absolute inset-0 rounded-[12px] bg-paper-deep/50" />
      )}
    </div>
  );
}
