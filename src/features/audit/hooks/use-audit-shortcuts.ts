import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuditFilterState } from "../components/AuditFilters";

export function useAuditShortcuts({
  currentOrgId,
  hasAnyFilter,
  setFilters,
  setAlertsOpen,
}: {
  currentOrgId: string | null;
  hasAnyFilter: boolean;
  setFilters: (s: AuditFilterState) => void;
  setAlertsOpen: (open: boolean) => void;
}) {
  const { toast } = useToast();

  useEffect(() => {
    let pendingG = false;
    let pendingGTimer: number | undefined;

    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return (
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable === true
      );
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const editable = isEditable(e.target);

      if (e.key === "Escape" && !editable) {
        if (hasAnyFilter) {
          e.preventDefault();
          setFilters({
            actions: [],
            recordIdQuery: "",
            valueKey: "",
            valueQuery: "",
            ipQuery: "",
            userAgentQuery: "",
            from: undefined,
            to: undefined,
            tableName: undefined,
            userId: undefined,
          });
          toast({ title: "Filtros limpos" });
        }
        return;
      }

      if (editable) return;

      if (e.key === "/") {
        const input = document.getElementById("audit-record-id-input") as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        pendingG = true;
        window.clearTimeout(pendingGTimer);
        pendingGTimer = window.setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }
      if (pendingG && e.key.toLowerCase() === "a") {
        pendingG = false;
        window.clearTimeout(pendingGTimer);
        if (currentOrgId) {
          e.preventDefault();
          setAlertsOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.clearTimeout(pendingGTimer);
    };
  }, [hasAnyFilter, currentOrgId, setFilters, setAlertsOpen, toast]);
}
