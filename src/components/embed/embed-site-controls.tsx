"use client";

import { useState } from "react";

type Theme = "light" | "dark";

export function EmbedSiteThemeButton() {
  const [theme, setTheme] = useState<Theme>(() => getDocumentTheme());

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("uga_embed_theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center border border-black bg-white text-sm font-black text-black transition hover:bg-uga-lime"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? "☼" : "☾"}
    </button>
  );
}

function getDocumentTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function EmbedSiteFullscreenButton({
  label,
}: {
  label: string;
}) {
  async function requestFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      return;
    }

    await document.exitFullscreen?.();
  }

  return (
    <button
      className="inline-flex h-9 items-center border border-black bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-uga-lime"
      onClick={requestFullscreen}
      type="button"
    >
      {label}
    </button>
  );
}
