/**
 * Página pública de aprovação de mockup.
 *
 * O cliente abre o link compartilhado (sem login) e aprove/rejeita a arte.
 * O token na URL É a credencial: nenhuma autenticação de app é exigida.
 * Toda a leitura/escrita passa pela edge function mockup-approval
 * (SECURITY DEFINER RPCs), nunca pelo client do app.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Loader2, Clock, ShieldCheck, Package, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getWarpedPreview } from "@/features/mockup/lib/mesh-warp";
import type { SurfaceType } from "@/features/mockup";
import type { Placement } from "@/features/mockup/hooks/use-mockup-editor-state";

const EDGE_URL = "https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1/mockup-approval";

interface ApprovalSnapshot {
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
  decided_at?: string | null;
  decision_note?: string | null;
  client_name?: string | null;
  mockup: {
    id: string;
    name: string;
    product_name: string | null;
    product_sku: string | null;
    thumbnail_url: string | null;
    editor_state: Record<string, unknown> | null;
  } | null;
}

const TOKEN_RE = /^[0-9a-f]{48}$/;

function useApprovalLookup(token: string | undefined) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: ApprovalSnapshot | null;
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
        setState({ loading: false, error: body.error ?? "Erro ao carregar aprovação", data: null });
        return;
      }
      const body = await res.json();
      setState({ loading: false, error: null, data: body.approval as ApprovalSnapshot });
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

const ClientApprovalPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const { loading, error, data, reload } = useApprovalLookup(token);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const [zoom, setZoom] = useState(100);
  const [warpUrl, setWarpUrl] = useState<string | null>(null);

  const editorState = data?.mockup?.editor_state ?? null;
  const logoPreview = (editorState?.logoPreview as string | undefined) ?? null;
  const surfaceType = ((editorState?.surfaceType as SurfaceType | undefined) ??
    "flat") as SurfaceType;
  const placement = editorState?.placement as Placement | undefined;
  const thumbnail = data?.mockup?.thumbnail_url ?? null;

  // Recompor a arte warpada (mesma engine do editor) quando há logo e superfície curva.
  useEffect(() => {
    if (!logoPreview || !placement || surfaceType === "flat") {
      setWarpUrl(null);
      return;
    }
    let cancelled = false;
    getWarpedPreview(
      logoPreview,
      480,
      480,
      surfaceType,
      placement.rotation ?? 0,
      placement.flipH ?? false,
      placement.flipV ?? false,
    )
      .then((url) => {
        if (!cancelled) setWarpUrl(url);
      })
      .catch(() => {
        if (!cancelled) setWarpUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logoPreview, placement, surfaceType]);

  const handleDecide = async (status: "approved" | "rejected") => {
    if (!token || !TOKEN_RE.test(token)) return;
    setSubmitting(status);
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status, note: note.trim() || undefined }),
      });
      if (res.status === 409) {
        toast.error("Este link já foi respondido.");
        reload();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Erro ao registrar sua resposta");
        return;
      }
      toast.success(
        status === "approved"
          ? "Aprovação registrada! Obrigado."
          : "Rejeição registrada. Obrigado.",
      );
      reload();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(null);
    }
  };

  const decisionContent = useMemo(() => {
    if (!data || data.mockup) return null; // pendente ainda
    const Icon = data.status === "approved" ? Check : data.status === "rejected" ? X : Clock;
    const title =
      data.status === "approved"
        ? "Mockup aprovado!"
        : data.status === "rejected"
          ? "Mockup rejeitado"
          : data.status === "expired"
            ? "Link expirado"
            : "Já respondido";
    return { Icon, title, note: data.decision_note };
  }, [data]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Aprovação segura de mockup
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {data?.mockup?.name ?? "Aprovação de mockup"}
          </h1>
          {data?.mockup?.product_name && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.mockup.product_name}
              {data.mockup.product_sku ? ` · SKU ${data.mockup.product_sku}` : ""}
            </p>
          )}
          {data?.client_name && (
            <p className="text-xs text-muted-foreground mt-1">Preparado para {data.client_name}</p>
          )}
        </div>

        {loading && (
          <div
            className="flex flex-col items-center justify-center py-24 text-muted-foreground"
            role="status"
          >
            <Loader2 className="w-8 h-8 animate-spin mb-3" aria-hidden="true" />
            <span className="text-sm">Carregando mockup...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-3xl mb-3">🔗</div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{error}</h2>
            <p className="text-sm text-muted-foreground">Peça ao remetente um link novo.</p>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="text-center py-20">
            <div className="text-3xl mb-3">🔍</div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Nada por aqui</h2>
            <p className="text-sm text-muted-foreground">Link não encontrado.</p>
          </div>
        )}

        {decisionContent && !loading && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <decisionContent.Icon
                className={`w-8 h-8 ${
                  data?.status === "approved"
                    ? "text-emerald-500"
                    : data?.status === "rejected"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
                aria-hidden="true"
              />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{decisionContent.title}</h2>
            {decisionContent.note && (
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto italic">
                “{decisionContent.note}”
              </p>
            )}
            {data?.decided_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Respondido em{" "}
                {format(new Date(data.decided_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            )}
          </div>
        )}

        {data?.mockup && !loading && !error && (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" aria-hidden="true" />
                  Arte{data.mockup.product_name ? ` ${data.mockup.product_name}` : " do mockup"}
                </span>
                <div className="flex items-center gap-1" role="group" aria-label="Controle de zoom">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    aria-label="Diminuir zoom"
                  >
                    <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                  <span
                    className="text-xs font-mono text-muted-foreground w-10 text-center"
                    aria-live="polite"
                  >
                    {zoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    aria-label="Aumentar zoom"
                  >
                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div
                className="flex items-center justify-center overflow-auto p-6"
                style={{
                  background:
                    "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px",
                }}
              >
                <div
                  className="relative bg-white rounded-lg border border-border shadow"
                  style={{ width: 420, height: 420 }}
                >
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt={data.mockup.product_name ?? "Produto"}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {logoPreview && placement && (
                    <div
                      className="absolute"
                      style={{
                        left: placement.x,
                        top: placement.y,
                        width: `${placement.scale * 100}%`,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <img
                        src={warpUrl && surfaceType !== "flat" ? warpUrl : logoPreview}
                        alt="Arte aplicada"
                        className="w-full h-full object-contain"
                        style={{
                          mixBlendMode:
                            (editorState?.blendMode as React.CSSProperties["mixBlendMode"]) ??
                            "normal",
                          opacity: ((editorState?.logoOpacity as number | undefined) ?? 100) / 100,
                          filter: editorState?.shadowEnabled
                            ? `drop-shadow(3px 3px ${Math.round(
                                ((editorState?.shadowIntensity as number | undefined) ?? 0) / 5,
                              )}px rgba(0,0,0,${
                                ((editorState?.shadowIntensity as number | undefined) ?? 0) / 100
                              }))`
                            : undefined,
                          ...(surfaceType === "flat"
                            ? {
                                transform: `rotate(${placement.rotation}deg) scaleX(${placement.flipH ? -1 : 1}) scaleY(${placement.flipV ? -1 : 1})`,
                              }
                            : {}),
                        }}
                      />
                    </div>
                  )}
                  {data.expires_at && (
                    <span className="absolute top-2 right-2 bg-background/90 border border-border rounded-full px-2 py-0.5 text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      Expira {format(new Date(data.expires_at), "dd/MM", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 mt-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-3">Sua decisão</h2>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Comentário (opcional) — ex.: ajustar cor da logo, aumentar logo..."
                className="min-h-[80px] mb-3"
                maxLength={1000}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDecide("rejected")}
                  disabled={!!submitting}
                >
                  {submitting === "rejected" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <X className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  Rejeitar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleDecide("approved")}
                  disabled={!!submitting}
                >
                  {submitting === "approved" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  Aprovar
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ClientApprovalPage;
