import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PREVIEW_QS_KEY, COMPARE_IDS_KEY, COMPARE_MODE_KEY } from "../pages/DamPreviewPage";

/**
 * Manages URL synchronization and sessionStorage persistence for the Preview page.
 */
export function usePreviewSync(
  searchParams: URLSearchParams,
  setSearchParams: (next: URLSearchParams, options?: { replace?: boolean }) => void,
  compareSelectedIds: string[]
) {
  const navigate = useNavigate();
  const didRestoreSessionRef = useRef(false);

  // Restore session from sessionStorage on mount if URL is empty
  useEffect(() => {
    if (didRestoreSessionRef.current) return;
    didRestoreSessionRef.current = true;
    if (typeof window === "undefined") return;
    if (searchParams.toString() !== "") return;
    
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(PREVIEW_QS_KEY); } catch { /* ignore */ }
    if (!saved) return;
    
    const trimmed = saved.startsWith("?") ? saved.slice(1) : saved;
    if (!trimmed) return;
    navigate(`/dam/preview?${trimmed}`, { replace: true });
  }, [navigate, searchParams]);

  // Persist current URL query string
  useEffect(() => {
    if (!didRestoreSessionRef.current) return;
    try {
      const qs = searchParams.toString();
      if (qs) sessionStorage.setItem(PREVIEW_QS_KEY, qs);
    } catch { /* ignore */ }
  }, [searchParams]);

  // Persist compare selection
  useEffect(() => {
    try {
      if (compareSelectedIds.length >= 2) {
        sessionStorage.setItem(COMPARE_IDS_KEY, compareSelectedIds.join(","));
      } else {
        sessionStorage.removeItem(COMPARE_IDS_KEY);
      }
    } catch { /* ignore */ }
  }, [compareSelectedIds]);

  return { didRestore: didRestoreSessionRef.current };
}
