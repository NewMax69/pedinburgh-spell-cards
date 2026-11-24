"use client";

import { toPng } from "html-to-image";

/** Карточка 180×252 pt → PNG с длинной стороной 1920 px. */
export async function saveCardPng(node: HTMLElement, name: string) {
  const rect = node.getBoundingClientRect();
  const pixelRatio = 1920 / (rect.height || 336);
  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: "#ffffff",
    style: { transform: "none", transformOrigin: "top left" },
  });
  const slug =
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "card";
  const link = document.createElement("a");
  link.download = `${slug}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
