import { useEffect } from "react";

const loaded = new Set<string>();

export function loadGoogleFont(name: string) {
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed || loaded.has(trimmed.toLowerCase())) return;
  loaded.add(trimmed.toLowerCase());
  const family = trimmed.replace(/\s+/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.googleFont = trimmed.toLowerCase();
  document.head.appendChild(link);
}

export function useGoogleFonts(names: string[]) {
  useEffect(() => {
    names.filter(Boolean).forEach(loadGoogleFont);
  }, [names.join("|")]);
}