import { useState } from "react";
import {
  Palette,
  Info,
  Bug,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Activity,
  Shield,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import { ErrorLogger, type LogEntry } from "@/lib/error-logger";
import { usePollingMetrics } from "@/hooks/use-visibility-polling";
import { useAuth } from "@/hooks/use-auth";

const levelColor: Record<string, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  warn: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  error: "bg-destructive/10 text-destructive",
  fatal: "bg-destructive text-destructive-foreground",
};

function DiagnosticsPanel() {
  const [entries, setEntries] = useState<ReadonlyArray<LogEntry>>(() =>
    ErrorLogger.getRecentErrors(),
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => setEntries(ErrorLogger.getRecentErrors());

  const clear = () => {
    ErrorLogger.clear();
    refresh();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Diagnóstico</h3>
          <Badge variant="secondary" className="text-xs">
            {entries.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              ErrorLogger.error("Erro de teste manual", new Error("fake-error-diagnostico"), {
                source: "DiagnosticsPanel",
              });
              refresh();
            }}
            className="text-xs text-yellow-600 dark:text-yellow-400"
          >
            🧪 Testar
          </Button>
          <Button variant="ghost" size="sm" onClick={refresh} className="text-xs">
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportJson}
            disabled={entries.length === 0}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" /> JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={entries.length === 0}
            className="text-xs text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Limpar
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Nenhum erro capturado — tudo funcionando! 🎉
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {[...entries].reverse().map((e, i) => {
            const key = `${e.timestamp}-${i}`;
            const isOpen = expanded === key;
            return (
              <button
                key={key}
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full text-left rounded-lg border border-border bg-background p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] uppercase ${levelColor[e.level] ?? ""}`}>
                    {e.level}
                  </Badge>
                  <span className="text-xs text-foreground truncate flex-1">{e.message}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleTimeString("pt-BR")}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                {isOpen && (
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <p>
                      <strong className="text-foreground">URL:</strong> {e.url}
                    </p>
                    {e.context && (
                      <p>
                        <strong className="text-foreground">Contexto:</strong>{" "}
                        {JSON.stringify(e.context)}
                      </p>
                    )}
                    {e.stack && (
                      <pre className="mt-1 p-2 rounded bg-muted text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                        {e.stack}
                      </pre>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
const stateLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  blurred: { label: "Lento", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  hidden: { label: "Pausado", color: "bg-muted text-muted-foreground" },
  disabled: { label: "Desativado", color: "bg-muted text-muted-foreground" },
};

function PollingMetricsPanel() {
  const metrics = usePollingMetrics();

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Polling & Rate Limiting</h3>
        <Badge variant="secondary" className="text-xs">
          {metrics.length} canais
        </Badge>
      </div>

      {metrics.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum polling ativo — faça login para ativar.
        </p>
      ) : (
        <div className="space-y-3">
          {metrics.map((m) => {
            const st = stateLabels[m.state] ?? stateLabels.disabled;
            return (
              <div key={m.label} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                  <Badge className={`text-[10px] uppercase ${st.color}`}>{st.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Requisições</span>
                    <span className="text-sm font-semibold text-foreground">{m.requestCount}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Intervalo</span>
                    <span className="text-sm font-semibold text-foreground">
                      {m.currentIntervalMs > 0
                        ? `${(m.currentIntervalMs / 1000).toFixed(0)}s`
                        : "—"}
                    </span>
                    <span className="text-[10px]">
                      {" "}
                      / base {(m.baseIntervalMs / 1000).toFixed(0)}s
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Último poll</span>
                    <span className="text-sm font-semibold text-foreground">
                      {m.lastPollAt ? new Date(m.lastPollAt).toLocaleTimeString("pt-BR") : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const Settings = () => {
  const { isMfaStrong, aal } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <h1 className="text-lg font-display font-bold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Preferências do Promo Design</p>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">Tema</Label>
              <p className="text-xs text-muted-foreground">Alterne entre tema claro e escuro</p>
            </div>
            <ThemeToggle />
          </div>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Segurança</h3>
          </div>
          <div className="space-y-4">
            <div
              className={`flex items-start gap-4 p-3 rounded-lg border ${isMfaStrong ? "bg-green-500/5 border-green-500/20" : "bg-primary/5 border-primary/10"}`}
            >
              <div
                className={`p-2 rounded-full ${isMfaStrong ? "bg-green-500/10" : "bg-primary/10"}`}
              >
                <Smartphone
                  className={`w-4 h-4 ${isMfaStrong ? "text-green-600" : "text-primary"}`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    Autenticação de Dois Fatores (2FA)
                  </h4>
                  <Badge
                    variant={isMfaStrong ? "default" : "outline"}
                    className={`text-[10px] ${isMfaStrong ? "bg-green-600" : "text-muted-foreground border-dashed"}`}
                  >
                    {isMfaStrong ? "Ativado" : "Recomendado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isMfaStrong
                    ? "Sua conta está protegida com autenticação de múltiplos fatores (AAL2)."
                    : "Adicione uma camada extra de segurança à sua conta usando um aplicativo de autenticação (Google Authenticator, Authy, etc.)."}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant={isMfaStrong ? "outline" : "default"}
                    className="h-8 text-xs gap-2"
                    asChild
                  >
                    <a
                      href="https://supabase.com/dashboard/project/_/auth/users"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <QrCode className="w-3.5 h-3.5" />{" "}
                      {isMfaStrong ? "Gerenciar 2FA" : "Configurar 2FA"}
                    </a>
                  </Button>
                </div>
                {!isMfaStrong && (
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Nível de segurança atual: <span className="font-mono">{aal}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-background/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2">
                Política de Senha
              </h4>
              <ul className="text-[10px] text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Mínimo de 10 caracteres (obrigatório).</li>
                <li>Verificação contra senhas vazadas (HIBP) ativada.</li>
                <li>Recomendamos o uso de caracteres especiais e números.</li>
              </ul>
            </div>
          </div>
        </section>

        <PollingMetricsPanel />

        <DiagnosticsPanel />

        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sobre</h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Promo Design</strong> — Plataforma de criação de
              mockups e ordens de serviço para produtos promocionais.
            </p>
            <p className="text-xs">Versão 1.0.0</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
