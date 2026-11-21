import { useEffect, useState } from "react";

export interface OnlineStatus {
  /** `navigator.onLine`. */
  online: boolean;
  /** True quando o navegador reporta offline ou a conexao caiu durante a sessao. */
  offlineSince: number | null;
}

function readInitialOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Estado de conectividade reativo. Isolado do `OnlineIndicator` para permitir
 * reuso (ex.: desabilitar botoes de escrita offline) e teste unitario sem
 * renderizar a UI.
 */
export function useOnlineStatus(): OnlineStatus {
  const [online, setOnline] = useState<boolean>(readInitialOnline);
  const [offlineSince, setOfflineSince] = useState<number | null>(() =>
    readInitialOnline() ? null : Date.now(),
  );

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setOfflineSince(null);
    };
    const goOffline = () => {
      setOnline(false);
      setOfflineSince((current) => current ?? Date.now());
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { online, offlineSince };
}
