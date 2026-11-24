"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Каталог" },
  { href: "/print", label: "Печать" },
  { href: "/library", label: "Мои карточки" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="7" y="3" width="12" height="16" rx="2" />
              <path d="M5 7v12a2 2 0 0 0 2 2h9" opacity=".7" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[19px] font-bold tracking-[0.02em]">Пединбург</span>
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
              карты заклинаний
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/editor"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Создать</span>
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line/70 px-4 py-1.5 no-scrollbar sm:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[12px] font-semibold",
                active ? "bg-ink text-paper" : "text-ink-soft"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
