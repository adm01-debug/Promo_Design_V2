import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Preferência de UI persistida em localStorage, isolada por usuário autenticado.
 *
 * Chave final: `pref:<userId|anon>:<key>`. O valor é validado por `isValid`
 * antes de ser aceito, evitando estados corrompidos vindos de versões antigas.
 */
export function usePersistedPreference<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T) => void] {
  const { user } = useAuth();
  const scope = user?.id ?? "anon";
  const storageKey = `pref:${scope}:${key}`;

  const read = useCallback((): T => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [storageKey, defaultValue, isValid]);

  const [value, setValue] = useState<T>(read);

  // Re-hidrata quando o escopo (usuário) muda — evita vazar preferência entre contas.
  useEffect(() => {
    setValue(read());
  }, [read]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage indisponível (modo privado/quota): mantém apenas em memória.
      }
    },
    [storageKey],
  );

  return [value, update];
}
