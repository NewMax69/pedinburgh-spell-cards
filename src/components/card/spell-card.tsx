"use client";

import { memo, useEffect, useState } from "react";
import { DIGIT_PATHS, RITUAL_PATH } from "@/lib/digit-paths";
import {
  BADGE,
  BADGE_PATH,
  CARD_H,
  CARD_W,
  DIVIDER,
  FOOTER,
  FRAME_LAYERS,
  HEADER_H,
  ILLU,
  RANGE,
  RITUAL,
  TITLE,
} from "@/lib/card-spec";
import { getCardLayout } from "@/lib/card-layout";
import { fontsReady, isFontsReady } from "@/lib/measure";
import { DEFAULT_THEME, type RenderOptions, type Spell } from "@/lib/types";
import { placeholderArt } from "@/lib/art";
import { getImage } from "@/lib/idb";
import { useUnits } from "@/lib/client-store";
import { convertRange } from "@/lib/units";
import { normalizeSchool } from "@/lib/schools";
import { cn } from "@/lib/cn";

function useFontsReady() {
  const [ready, setReady] = useState(() => isFontsReady());
  useEffect(() => {
    if (ready) return;
    let alive = true;
    fontsReady().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ready]);
  return ready;
}

function useSpellArt(spell: Spell) {
  const school = normalizeSchool(spell.school) ?? "Воплощение";
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fallback = () => {
      const url = placeholderArt(spell.name, school);
      if (alive) setSrc(url);
    };
    if (!spell.image) {
      fallback();
      return () => {
        alive = false;
      };
    }
    if (spell.image.startsWith("idb:")) {
      getImage(spell.image.slice(4)).then((data) => {
        if (!alive) return;
        if (data) setSrc(data);
        else fallback();
      });
    } else {
      setSrc(spell.image);
    }
    return () => {
      alive = false;
    };
  }, [spell.image, spell.name, school]);

  return { src, onError: () => setSrc(placeholderArt(spell.name, school)) };
}

interface LinesProps {
  layout: ReturnType<typeof getCardLayout>["title"];
  x: number;
  y: number;
  italic?: boolean;
  weight?: number;
}

function TextLines({ layout, x, y, italic = false, weight = 400 }: LinesProps) {
  return (
    <>
      {layout.lines.map((line, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${x}pt`,
            top: `${y + line.y}pt`,
            fontSize: `${layout.size}pt`,
            lineHeight: `${layout.lineHeight}pt`,
            fontStyle: italic ? "italic" : "normal",
            whiteSpace: "nowrap",
          }}
        >
          {line.runs.map((run, runIndex) => (
            <span
              key={runIndex}
              style={{
                fontWeight: run.bold ? 700 : weight,
                fontStyle: (run.italic ?? italic) ? "italic" : "normal",
              }}
            >
              {run.text}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

export interface SpellCardProps {
  spell: Spell;
  options?: RenderOptions;
  className?: string;
}

/**
 * Карточка заклинания 180 × 252 pt. Геометрия — из Figma (см. card-spec.ts),
 * текст раскладывается движком layout.ts, поэтому превью и PDF совпадают.
 */
export const SpellCard = memo(function SpellCard({ spell, options = {}, className }: SpellCardProps) {
  const ready = useFontsReady();
  const effective: RenderOptions = {
    ...options,
    showArt: options.showArt ?? spell.showArt,
    showUpgrade: options.showUpgrade ?? spell.showUpgrade,
    showComponents: options.showComponents ?? spell.showComponents,
    artInHeader: options.artInHeader ?? spell.artInHeader,
  };
  const art = useSpellArt(spell);
  const { units } = useUnits();
  const display =
    units === "ft" ? { ...spell, range: convertRange(spell.range, units) } : spell;
  const layout = ready ? getCardLayout(display, effective) : null;

  const theme = { ...DEFAULT_THEME, ...(spell.theme ?? {}), ...(options.theme ?? {}) };

  return (
    <div
      className={cn("spell-card", className)}
      style={{
        width: `${CARD_W}pt`,
        height: `${CARD_H}pt`,
        position: "relative",
        overflow: "hidden",
        background: theme.paper,
        color: theme.ink,
        fontFamily: '"Alegreya Sans", "Times New Roman", serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: `${HEADER_H}pt`,
          background: theme.header,
        }}
      />

      {/* иллюстрация: три заливки вместо обводок — без артефактов в углах */}
      <div
        style={{
          position: "absolute",
          left: `${ILLU.x}pt`,
          top: `${ILLU.y}pt`,
          width: `${ILLU.size}pt`,
          height: `${ILLU.size}pt`,
        }}
      >
        <svg viewBox="0 0 60 60" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <path d={FRAME_LAYERS.plate} fill={theme.paper} />
        </svg>
        {art.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.src}
            alt=""
            draggable={false}
            onError={art.onError}
            style={{
              position: "absolute",
              left: `${FRAME_LAYERS.imageInset}pt`,
              top: `${FRAME_LAYERS.imageInset}pt`,
              width: `${FRAME_LAYERS.imageSize}pt`,
              height: `${FRAME_LAYERS.imageSize}pt`,
              objectFit: "cover",
              background: "linear-gradient(135deg,#1c2230,#0b0e12)",
              clipPath:
                "polygon(0% 7.41%, 7.41% 7.41%, 7.41% 0%, 92.59% 0%, 92.59% 7.41%, 100% 7.41%, 100% 92.59%, 92.59% 92.59%, 92.59% 100%, 7.41% 100%, 7.41% 92.59%, 0% 92.59%)",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              left: `${FRAME_LAYERS.imageInset}pt`,
              top: `${FRAME_LAYERS.imageInset}pt`,
              width: `${FRAME_LAYERS.imageSize}pt`,
              height: `${FRAME_LAYERS.imageSize}pt`,
              background: "linear-gradient(135deg,#1c2230,#0b0e12)",
              clipPath:
                "polygon(0% 7.41%, 7.41% 7.41%, 7.41% 0%, 92.59% 0%, 92.59% 7.41%, 100% 7.41%, 100% 92.59%, 92.59% 92.59%, 92.59% 100%, 7.41% 100%, 7.41% 92.59%, 0% 92.59%)",
            }}
          />
        )}
        <svg viewBox="0 0 60 60" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="3" y="3" width="4" height="4" fill={theme.ink} />
          <rect x="53" y="3" width="4" height="4" fill={theme.ink} />
          <rect x="3" y="53" width="4" height="4" fill={theme.ink} />
          <rect x="53" y="53" width="4" height="4" fill={theme.ink} />
          <path
            d={FRAME_LAYERS.outerStroke}
            fill="none"
            stroke={theme.ink}
            strokeWidth="1"
            strokeLinejoin="bevel"
          />
          <path
            d={FRAME_LAYERS.innerStroke}
            fill="none"
            stroke={theme.ink}
            strokeWidth="1"
            strokeLinejoin="bevel"
          />
        </svg>
      </div>

      {/* ритуал: ромб 14×16 под бейджем, выступает из нижнего правого края */}
      {spell.ritual && (
        <div
          style={{
            position: "absolute",
            left: `${RITUAL.x}pt`,
            top: `${RITUAL.y}pt`,
            width: `${RITUAL.w}pt`,
            height: `${RITUAL.h}pt`,
          }}
        >
          <svg viewBox="0 0 14 16" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <g transform="translate(0.14 0) scale(0.762)">
              <path
                d={BADGE_PATH}
                fill={theme.paper}
                stroke={theme.ink}
                strokeWidth={1.31}
                strokeLinejoin="round"
              />
            </g>
            <g transform="translate(7 8)">
              <path d={RITUAL_PATH.d} fill={theme.ink} />
            </g>
          </svg>
        </div>
      )}

      {/* бейдж уровня */}
      {options.showBadge !== false && (
        <div
          style={{
            position: "absolute",
            left: `${BADGE.x}pt`,
            top: `${BADGE.y}pt`,
            width: `${BADGE.w}pt`,
            height: `${BADGE.h}pt`,
          }}
        >
          <svg viewBox="0 0 18 21" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <path d={BADGE_PATH} fill={theme.ink} />
            <path
              d={BADGE_PATH}
              fill={theme.paper}
              transform="translate(9 10.5) scale(0.8889 0.9048) translate(-9 -10.5)"
            />
            <g transform={`translate(${9 + (String(spell.level) === "1" ? -0.6 : 0)} 10)`}>
              <path d={DIGIT_PATHS[String(spell.level)]?.d ?? DIGIT_PATHS["0"].d} fill={theme.ink} />
            </g>
          </svg>
        </div>
      )}

      {layout && (
        <>
          <div
            style={{
              position: "absolute",
              left: `${TITLE.x}pt`,
              top: `${TITLE.y}pt`,
              width: `${TITLE.w}pt`,
            }}
          >
            <TextLines layout={layout.title} x={0} y={0} weight={700} />
            {(effective.showComponents !== false || effective.artInHeader) && (
              <TextLines layout={layout.components} x={0} y={layout.componentsTop} />
            )}
          </div>

          <div
            style={{
              position: "absolute",
              left: `${RANGE.x}pt`,
              top: `${RANGE.y}pt`,
              width: `${RANGE.w}pt`,
              height: `${RANGE.h}pt`,
            }}
          >
            {layout.range.map((cell, index) => (
              <span
                key={index}
                style={{
                  position: "absolute",
                  left: `${index * 54.67}pt`,
                  top: 0,
                  width: `${RANGE.cell}pt`,
                  textAlign: "center",
                  fontSize: `${cell.size}pt`,
                  lineHeight: `${RANGE.h}pt`,
                  fontWeight: 700,
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                }}
              >
                {cell.text}
              </span>
            ))}
            <span
              style={{
                position: "absolute",
                left: `${RANGE.sep[0]}pt`,
                top: "1.5pt",
                width: "0.75pt",
                height: "7pt",
                background: theme.ink,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: `${RANGE.sep[1]}pt`,
                top: "1.5pt",
                width: "0.75pt",
                height: "7pt",
                background: theme.ink,
              }}
            />
          </div>

          <TextLines layout={layout.body} x={12} y={100.5} italic />

          <div
            style={{
              position: "absolute",
              left: `${DIVIDER.x}pt`,
              top: `${DIVIDER.y}pt`,
              width: `${DIVIDER.w}pt`,
              height: "1pt",
              background: theme.accent,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: `${FOOTER.y}pt`,
              width: `${CARD_W}pt`,
              height: `${FOOTER.h}pt`,
              textAlign: "center",
              fontSize: `${layout.footer.size}pt`,
              lineHeight: `${FOOTER.h}pt`,
              fontStyle: "italic",
            }}
          >
            {layout.footer.text}
          </div>
        </>
      )}
    </div>
  );
});
