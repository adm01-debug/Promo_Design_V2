import { format } from "date-fns";

export interface AuditCsvRow {
  created_at: string;
  user_id: string;
  user_label?: string;
  action: string;
  table_name: string;
  record_id: string | null;
}

function escape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAuditCsv(rows: AuditCsvRow[]): string {
  const header = ["Quando", "Usuario", "Acao", "Tabela", "RecordId"].join(",");
  const lines = rows.map((r) =>
    [
      escape(format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")),
      escape(r.user_label || r.user_id),
      escape(r.action),
      escape(r.table_name),
      escape(r.record_id ?? ""),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}