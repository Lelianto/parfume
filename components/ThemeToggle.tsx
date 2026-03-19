"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="fixed right-4 top-4 z-[200] flex h-10 w-10 items-center justify-center rounded-full border border-gold-700/30 bg-surface-300/90 shadow-lg backdrop-blur-xl transition-all hover:border-gold-400/50 hover:shadow-gold-400/10 active:scale-90 md:right-6 md:top-5"
    >
      {isDark ? (
        <Sun size={18} className="text-gold-400" />
      ) : (
        <Moon size={18} className="text-gold-400" />
      )}
    </button>
  );
}
