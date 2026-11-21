/**
 * Pagina publica do manual de marca compartilhado.
 *
 * O cliente abre o link (sem login) e ve a identidade visual. O token na URL
 * e a credencial: a leitura passa pela edge function brand-share
 * (SECURITY DEFINER RPC), nunca pelo client do app autenticado.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Clock, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrandPreviewCard } from "../components/BrandPreviewCard";
import { RuleChips } from "../components/RuleChips";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";

const EDGE_URL = "https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1/brand-share";

type ShareStatus = "active" | "revoked" | "expired";

interface BrandShareSnapshot {
  status: ShareStatus;
  expires_at: string;
  client_name?: string | null;
  guideline: {
    id: string;
    client_id: string;
    primary_colors: ColorEntry[];
    secondary_colors: ColorEntry[];
    fonts: FontEntry[];
    do_rules: string[];
    dont_rules: string[];
    logo_asset_id: string | null;
    notes: string | null;
    updated_at: string;
  } | null;
}

const TOKEN_RE = /^[0-9a-f]{48}$/;

function useShareLookup(token: string | undefined) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: BrandShareSnapshot | null;
  }>({ loading: true, error: null, data: null });

  const reload = useCallback(async () => {
    if (!token || !TOKEN_RE.test(token)) {
      setState({ loading: false, error: "Link inválido", data: null });
      return;
    }
    setState({ loading: true, error: null, data: null });
    try {
      const res = await fetch(`${EDGE_URL}?token=${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setState({ loading: false, error: "Link inválido ou expirado", data: null });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ loading: false, error: body.error ?? "Erro ao carregar o manual", data: null });
        return;
      }
      const body = await res.json();
      setState({ loading: false, error: null, data: body.share as BrandShareSnapshot });
    } catch {
      setState({
        loading: false,
        error: "Erro de conexão. Verifique sua internet e tente novamente.",
        data: null,
      });
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

const BrandSharePublicPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const { loading, error, data } = useShareLookup(token);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          Carregando manual…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md text-center p-8">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="https://promo-design-v2.vercel.app">Ir para o site</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!data || data.status !== "active" || !data.guideline) {
    const statusLabel: Record<string, string> = {
      expired: "Este link de compartilhamento expirou.",
      revoked: "Este link de compartilhamento foi revogado.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md text-center p-8">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Manual indisponível</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {data ? (statusLabel[data.status] ?? "Manual indisponível.") : "Manual indisponível."}
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="https://promo-design-v2.vercel.app">Ir para o site</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const g = data.guideline;
  const primary = Array.isArray(g.primary_colors) ? g.primary_colors : [];
  const secondary = Array.isArray(g.secondary_colors) ? g.secondary_colors : [];
  const fonts = Array.isArray(g.fonts) ? g.fonts : [];
  const doRules = Array.isArray(g.do_rules) ? g.do_rules : [];
  const dontRules = Array.isArray(g.dont_rules) ? g.dont_rules : [];
  const clientName = data.client_name ?? "Cliente";

  const hasRules = doRules.length > 0 || dontRules.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">Manual de Marca</h1>
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {clientName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
              Atualizado em{" "}
              {format(new Date(g.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <BrandPreviewCard
          clientName={clientName}
          primary={primary}
          secondary={secondary}
          fonts={fonts}
          logo={null}
        />

        {hasRules ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RuleChips items={doRules} variant="do" editable={false} />
              <RuleChips items={dontRules} variant="dont" editable={false} />
            </CardContent>
          </Card>
        ) : null}

        {g.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {g.notes}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default BrandSharePublicPage;
