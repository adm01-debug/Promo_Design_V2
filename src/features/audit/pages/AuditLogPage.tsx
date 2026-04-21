import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  created_at: string;
}

const ACTION_COLOR: Record<AuditEntry["action"], "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const AuditLogPage = () => {
  const { currentOrgId } = useOrganizations();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, user_id, table_name, record_id, action, created_at")
        .eq("organization_id", currentOrgId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ScrollText className="h-8 w-8" /> Trilha de auditoria</h1>
        <p className="text-muted-foreground">Últimas 200 ações na sua organização.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Eventos</CardTitle></CardHeader>
        <CardContent>
          {!currentOrgId ? (
            <p className="text-muted-foreground">Selecione uma organização.</p>
          ) : isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground">Sem eventos ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 border-b text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={ACTION_COLOR[e.action]}>{e.action}</Badge>
                    <span className="font-mono">{e.table_name}</span>
                    {e.record_id && <span className="font-mono text-xs text-muted-foreground">{e.record_id.slice(0, 8)}…</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{e.user_id.slice(0, 8)}…</span>
                    <span>{format(new Date(e.created_at), "dd/MM/yyyy HH:mm:ss")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;
