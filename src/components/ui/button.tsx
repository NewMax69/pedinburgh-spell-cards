"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-10px_rgba(28,74,55,0.8)] hover:bg-accent-deep active:translate-y-px",
  secondary:
    "bg-white/80 text-ink border border-line-strong hover:bg-white hover:border-ink/25 active:translate-y-px",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
  dark: "bg-ink text-paper hover:bg-ink-soft active:translate-y-px",
  danger: "bg-danger/10 text-danger hover:bg-danger/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-[13.5px] rounded-xl gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2.5",
  icon: "h-9 w-9 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
});
