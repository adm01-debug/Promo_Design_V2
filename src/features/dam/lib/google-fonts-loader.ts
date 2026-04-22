import { useEffect, useState } from "react";

export const BRAND_WEIGHTS = [300, 400, 500, 600, 700, 900] as const;

const cache = new Map<string, Promise<boolean>>();
let prescanned = false;

function prescanExisting() {
  if (prescanned || typeof document === "undefined") return;
  prescanned = true;
  const links = document.head.querySelectorAll<HTMLLinkElement>(
    'link[href*="fonts.googleapis.com"]',
  );
  links.forEach((link) => {
    // Suporta múltiplos `family=` no mesmo href e separadores `|` (API legada).
    const matches = link.href.matchAll(/family=([^&]+)/g);
    for (const m of matches) {
      const raw = m[1];
      const families = raw.split("|");
      for (const f of families) {
        const name = decodeURIComponent(f.split(":")[0].replace(/\+/g, " ")).trim().toLowerCase();
        if (name && !cache.has(name)) {
          cache.set(name, Promise.resolve(true));
        }
      }
    }
  });
}

function encodeFamily(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, "+");
}

export function loadGoogleFont(
  name: string,
  weights: readonly number[] = BRAND_WEIGHTS,
): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  prescanExisting();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return Promise.resolve(false);
  const key = trimmed.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const family = encodeFamily(trimmed);
  const wghtList = [...weights].sort((a, b) => a - b).join(";");
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${wghtList}&display=swap`;

  // Defesa extra contra corridas: se já existe um <link> para essa família,
  // não injeta novo, apenas confirma o carregamento via FontFaceSet.
  const existing = document.head.querySelector<HTMLLinkElement>(
    `link[data-google-font="${key}"]`,
  );
  if (existing) {
    const fontsApi = (document as Document & { fonts?: FontFaceSet }).fonts;
    const p = fontsApi?.load
      ? fontsApi.load(`1em "${trimmed}"`).then((f) => f.length > 0).catch(() => false)
      : Promise.resolve(true);
    cache.set(key, p);
    return p;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.googleFont = key;

  const promise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (!ok) {
        cache.set(key, Promise.resolve(false));
        console.warn(`[google-fonts] Failed to load "${trimmed}"`);
      }
      resolve(ok);
    };

    link.onload = () => {
      const fontsApi = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (fontsApi?.load) {
        fontsApi
          .load(`1em "${trimmed}"`)
          .then((faces) => finish(faces.length > 0))
          .catch(() => finish(false));
      } else {
        finish(true);
      }
    };
    link.onerror = () => finish(false);
    setTimeout(() => finish(false), 3000);

    document.head.appendChild(link);
  });

  cache.set(key, promise);
  return promise;
}

export function useGoogleFonts(names: string[]): {
  loaded: Record<string, boolean>;
  allReady: boolean;
} {
  const clean = names.map((n) => (n ?? "").trim()).filter(Boolean);
  const key = clean.map((n) => n.toLowerCase()).join("|");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    if (clean.length === 0) {
      setLoaded({});
      return;
    }
    // Resolve cada fonte individualmente para forçar re-render assim que cada uma
    // estiver pronta, evitando flash de fallback no primeiro paint.
    clean.forEach((n) => {
      loadGoogleFont(n).then((ok) => {
        if (cancelled) return;
        setLoaded((prev) => {
          const k = n.toLowerCase();
          if (prev[k] === ok) return prev;
          return { ...prev, [k]: ok };
        });
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const allReady = clean.length > 0 && clean.every((n) => loaded[n.toLowerCase()] !== undefined);
  return { loaded, allReady };
}