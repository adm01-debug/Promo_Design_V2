import { useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchAuditExport, type AuditFilters } from "../hooks/use-audit-log";
import { buildAuditCsv, downloadCsv } from "../lib/audit-csv";

export function useAuditExport({
  currentOrgId,
  queryFilters,
  userLabel
}: {
  currentOrgId: string | null;
  queryFilters: AuditFilters;
  userLabel: (uid: string) => string;
}) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!currentOrgId) return;
    setExporting(true);
    try {
      const all = await fetchAuditExport(queryFilters, 5000);
      const csv = buildAuditCsv(
        all.map((r) => ({
          created_at: r.created_at,
          user_id: r.user_id,
          user_label: userLabel(r.user_id),
          action: r.action,
          table_name: r.table_name,
          record_id: r.record_id,
        })),
      );
      downloadCsv(`auditoria-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv);
      toast({ title: "Exportado", description: `${all.length} eventos baixados.` });
    } catch (err) {
      toast({ title: "Erro ao exportar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return { exporting, handleExport };
}
