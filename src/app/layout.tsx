import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Пединбург — карты заклинаний",
  description:
    "Каталог карт заклинаний D&D 5e: 391 заклинание, печать A4 по 9 карточек и редактор своих карт.",
};

export const viewport: Viewport = {
  themeColor: "#f4f1e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="preload"
          href="/fonts/AlegreyaSans-Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/AlegreyaSans-Italic.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/AlegreyaSans-Bold.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/AlegreyaSans-BoldItalic.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#171612",
              color: "#f4f1e9",
              border: "1px solid #3b3830",
              borderRadius: "12px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
