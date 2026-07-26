import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Video, Search, Loader2, Package, Sparkles, Play, Clock, ChevronLeft, ChevronRight, Film, Image as X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, getProductImageUrl } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";
import VideoPreviewAnimation from "@/features/video/components/VideoPreviewAnimation";
import { useMoodboardStore, TONE_LABELS, PALETTE_LABELS, TONE_TO_STYLE } from "@/hooks/use-moodboard-preferences";
import { useCinemaStore } from "@/hooks/use-cinema-preferences";
import { ASPECT_RATIOS, VIDEO_STYLES, TEMPLATES, ASPECT_PREVIEW, type AspectRatio, type VideoStyle, type CreationMode } from "@/features/video/components/VideoNewConstants";
import MotionPresetPicker from "@/features/video/components/MotionPresetPicker";
import GeneratedPromptPanel from "@/features/video/components/GeneratedPromptPanel";
import FrameAnchorsPicker, { isValidFrameUrl } from "@/features/video/components/FrameAnchorsPicker";
import { buildVideoPrompt } from "@/features/video/lib/build-video-prompt";
import { useVideoGeneration } from "@/features/video/hooks/use-video-generation";
import { useOrganizations } from "@/hooks/use-organization";
import { parseRemixState, getInspirationRecipe } from "@/features/video/lib/inspiration-recipes";

const CHARACTER_DESCRIPTIONS: Record<string, string> = {
  "👩‍💼": "a professional female brand ambassador presenting the product",
  "🧑": "a young adult brand ambassador presenting the product",
  "🧔": "a bearded male brand ambassador presenting the product",
  "👩‍🎨": "a creative female artist presenting the product",
  "👮": "a uniformed officer presenting the product",
  "🧑‍💻": "a tech professional presenting the product",
  "👩‍🔬": "a female scientist presenting the product",
  "👤": "a neutral silhouette presenting the product",
};

/** Soul ID: rótulo estável por avatar, garante consistência entre gerações. */
const CHARACTER_SOUL_LABELS: Record<string, string> = {
  "👩‍💼": "Executive Ambassador",
  "🧑": "Young Ambassador",
  "🧔": "Bearded Ambassador",
  "👩‍🎨": "Creative Artist",
  "👮": "Uniformed Officer",
  "🧑‍💻": "Tech Professional",
  "👩‍🔬": "Lab Scientist",
  "👤": "Neutral Silhouette",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  generating: "Gerando...",
  ready: "Pronto",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const VideoNew = () => {
  const { currentOrgId } = useOrganizations();
  const location = useLocation();
  /**
   * Remix vindo do Feed de Inspiração. `location.state` é controlado pelo
   * usuário (history API), por isso passa por validação estrita: só o id da
   * receita é aceito e todos os valores vêm do catálogo canônico.
   */
  const remix = useMemo(() => parseRemixState(location.state), [location.state]);
  const remixRecipe = remix ? getInspirationRecipe(remix.remixRecipeId) : undefined;
  const { job, isEnqueuing, isPolling, enqueue, cancel } = useVideoGeneration();
  const moodboard = useMoodboardStore((s) => s.preferences);
  const clearMoodboard = useMoodboardStore((s) => s.clearPreferences);
  const cinema = useCinemaStore((s) => s.preferences);
  const clearCinema = useCinemaStore((s) => s.clearPreferences);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() => remix?.aspectRatio ?? "9:16");
  const [videoStyle, setVideoStyle] = useState<VideoStyle>(() => remix?.videoStyle ?? (moodboard?.tone ? (TONE_TO_STYLE[moodboard.tone] || "premium") as VideoStyle : "premium"));
  const [selectedTemplate, setSelectedTemplate] = useState<string>(() => remix?.templateId ?? "reveal");
  const [creationMode, setCreationMode] = useState<CreationMode>("template");
  const [aiPrompt, setAiPrompt] = useState(() => remix?.extraInstructions ?? "");
  const [duration, setDuration] = useState<5 | 10>(() => remix?.durationSeconds ?? 5);
  const [selectedCharacter, setSelectedCharacter] = useState<string>(() => {
    return localStorage.getItem("selected_character_avatar") || "👩‍💼";
  });
  const [motionPresetIds, setMotionPresetIds] = useState<string[]>(() => remix?.motionPresetIds ?? []);
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [startFrameUrl, setStartFrameUrl] = useState("");
  const [endFrameUrl, setEndFrameUrl] = useState("");
  const [step, setStep] = useState<"product" | "config" | "preview">("product");

  useEffect(() => {
    // Clear selection after consumption to avoid sticky states between sessions
    return () => {
      localStorage.removeItem("selected_character_avatar");
      localStorage.removeItem("selected_character_id");
    };
  }, []);

  const { data: productsData, isLoading: productsLoading } = useProducts({ search, page, pageSize: 20, onlyWithImages: true });
  const products = productsData?.products || [];
  const totalPages = Math.ceil((productsData?.total || 0) / 20);
  const filteredTemplates = useMemo(() => TEMPLATES.filter(() => true), []);
  const selectedTemplateMeta = TEMPLATES.find(t => t.id === selectedTemplate);

  // Estado derivado — nunca useEffect. Só âncoras válidas entram no prompt/payload.
  const validStartFrame = isValidFrameUrl(startFrameUrl) ? startFrameUrl.trim() : null;
  const validEndFrame = isValidFrameUrl(endFrameUrl) ? endFrameUrl.trim() : null;
  const soulLabel = CHARACTER_SOUL_LABELS[selectedCharacter] ?? null;



  const generatedPrompt = useMemo(
    () =>
      selectedProduct
        ? buildVideoPrompt({
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            motionPresetIds,
            aspectRatio,
            durationSeconds: duration,
            videoStyle,
            moodboard,
            cinema,
            characterDescription:
              selectedTemplate === "ambassador" && creationMode === "template"
                ? CHARACTER_DESCRIPTIONS[selectedCharacter]
                : null,
            characterSoulLabel:
              selectedTemplate === "ambassador" && creationMode === "template"
                ? soulLabel
                : null,
            startFrameUrl: validStartFrame,
            endFrameUrl: validEndFrame,
            extraInstructions: creationMode === "ai" ? aiPrompt : null,
          })
        : "",
    [selectedProduct, motionPresetIds, aspectRatio, duration, videoStyle, moodboard, cinema, selectedTemplate, creationMode, selectedCharacter, aiPrompt, soulLabel, validStartFrame, validEndFrame],
  );
  const finalPrompt = promptOverride ?? generatedPrompt;



  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Video className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-display font-semibold text-foreground">Video Studio</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {(["product", "config", "preview"] as const).map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <button onClick={() => { if (s === "product" || selectedProduct) setStep(s); }} className={`px-2.5 py-1 rounded-md transition-colors ${step === s ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"}`}>
                  {i + 1}. {s === "product" ? "Produto" : s === "config" ? "Configurar" : "Preview"}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded bg-surface-2 border border-border">{aspectRatio}</span>
          <Button size="sm" className="text-xs gap-1.5 bg-gradient-primary text-primary-foreground" disabled><Play className="w-3.5 h-3.5" /> Gerar Vídeo</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Banners */}
        {remixRecipe && (
          <div className="shrink-0 mx-4 mt-3 mb-1 flex items-center gap-3 p-3 rounded-xl border border-accent/30 bg-accent/5">
            <Sparkles className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Remix:</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">{remixRecipe.title}</span>
              <span className="text-[10px] text-muted-foreground">{remixRecipe.description}</span>
            </div>
            <Link to="/video/inspiration" className="text-[10px] text-accent hover:underline shrink-0">Ver feed</Link>
          </div>
        )}
        {moodboard && (
          <div className="shrink-0 mx-4 mt-3 mb-1 flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <Palette className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Moodboard:</span>
              {moodboard.tone && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{TONE_LABELS[moodboard.tone]}</span>}
              {moodboard.palette && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground font-medium">{PALETTE_LABELS[moodboard.palette]}</span>}
              {moodboard.scenes.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">{moodboard.scenes.length} cenário{moodboard.scenes.length > 1 ? "s" : ""}</span>}
            </div>
            <Link to="/video/moodboard" className="text-[10px] text-primary hover:underline shrink-0">Editar</Link>
            <button onClick={clearMoodboard} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {cinema && (
          <div className="shrink-0 mx-4 mt-2 mb-1 flex items-center gap-3 p-3 rounded-xl border border-secondary/30 bg-secondary/5">
            <Film className="w-4 h-4 text-secondary shrink-0" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Cinema:</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground font-medium">{cinema.presetLabel}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">{cinema.lightingLabel}</span>
              {cinema.letterbox && <span className="text-[10px] text-muted-foreground">Letterbox</span>}
              {cinema.grain && <span className="text-[10px] text-muted-foreground">Grain</span>}
            </div>
            <Link to="/video/cinema" className="text-[10px] text-secondary hover:underline shrink-0">Editar</Link>
            <button onClick={clearCinema} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "product" && (
              <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border shrink-0">
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" placeholder="Buscar produto por nome ou SKU..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" /></div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {productsLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Carregando...</span></div>
                  : products.length === 0 ? <div className="flex flex-col items-center justify-center py-20"><Package className="w-10 h-10 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Nenhum produto encontrado</p></div>
                  : <>
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {products.map((product) => (
                        <button key={product.id} onClick={() => { setSelectedProduct(product); setStep("config"); }} className="group rounded-lg border border-border hover:border-primary/40 transition-all overflow-hidden text-left">
                          <div className="aspect-square bg-surface-2 flex items-center justify-center p-2"><img src={getProductImageUrl(product)} alt={product.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} /></div>
                          <div className="p-2 bg-card"><h3 className="text-xs font-semibold text-foreground truncate">{product.name}</h3><p className="text-[10px] text-muted-foreground truncate">{product.sku}</p></div>
                        </button>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs"><ChevronLeft className="w-3 h-3" /> Anterior</Button>
                        <span className="text-xs text-muted-foreground font-mono">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs">Próximo <ChevronRight className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </>}
                </div>
              </motion.div>
            )}

            {step === "config" && selectedProduct && (
              <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex overflow-hidden">
                <div className="w-[380px] border-r border-border overflow-y-auto p-4 space-y-6 shrink-0">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                    <div className="w-14 h-14 rounded-lg bg-surface-1 border border-border flex items-center justify-center p-1 shrink-0"><img src={getProductImageUrl(selectedProduct)} alt="" className="w-full h-full object-contain" /></div>
                    <div className="flex-1 min-w-0"><h3 className="text-sm font-display font-semibold text-foreground truncate">{selectedProduct.name}</h3><p className="text-[10px] text-muted-foreground">{selectedProduct.sku}</p></div>
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setStep("product")}>Trocar</Button>
                  </div>
                  <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Modo de Criação</p><div className="flex gap-2">
                    <button onClick={() => setCreationMode("template")} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${creationMode === "template" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><Film className="w-5 h-5 text-primary" /><span className="text-xs font-medium text-foreground">Template</span></button>
                    <button onClick={() => setCreationMode("ai")} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${creationMode === "ai" ? "border-secondary bg-secondary/10" : "border-border hover:border-primary/40"}`}><Sparkles className="w-5 h-5 text-secondary" /><span className="text-xs font-medium text-foreground">IA</span></button>
                  </div></div>
                  <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Formato</p><div className="grid grid-cols-4 gap-2">{ASPECT_RATIOS.map((ar) => (<button key={ar.value} onClick={() => setAspectRatio(ar.value)} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${aspectRatio === ar.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><ar.icon className={`w-4 h-4 ${aspectRatio === ar.value ? "text-primary" : "text-muted-foreground"}`} /><span className="text-[10px] font-semibold text-foreground">{ar.label}</span></button>))}</div></div>
                  <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Duração</p><div className="flex gap-2">{([5, 10] as const).map((d) => (<button key={d} onClick={() => setDuration(d)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 transition-all ${duration === d ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><Clock className={`w-3.5 h-3.5 ${duration === d ? "text-primary" : "text-muted-foreground"}`} /><span className="text-xs font-medium text-foreground">{d}s</span></button>))}</div></div>
                  <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Estilo Visual</p><div className="grid grid-cols-3 gap-2">{VIDEO_STYLES.map((vs) => (<button key={vs.value} onClick={() => setVideoStyle(vs.value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${videoStyle === vs.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><vs.icon className={`w-4 h-4 ${vs.color}`} /><span className="text-[10px] font-medium text-foreground">{vs.label}</span></button>))}</div></div>
                  {creationMode === "template" ? (
                    <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Template</p><div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">{filteredTemplates.map((t) => (<button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center shrink-0"><Film className={`w-5 h-5 ${selectedTemplate === t.id ? "text-primary" : "text-muted-foreground"}`} /></div><div className="flex-1 min-w-0"><h4 className="text-xs font-semibold text-foreground">{t.name}</h4><p className="text-[10px] text-muted-foreground">{t.desc}</p></div><span className="text-[10px] font-mono text-muted-foreground shrink-0">{t.duration}</span></button>))}</div></div>
                  ) : (
                    <div><p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Prompt IA</p><textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Descreva o vídeo que deseja criar..." className="w-full h-28 p-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary" /><p className="text-[10px] text-muted-foreground mt-1">A IA gerará um vídeo de {duration}s no formato {aspectRatio} com estilo {videoStyle}</p></div>
                  )}
                  {selectedTemplate === "ambassador" && creationMode === "template" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Embaixador da Marca</p>
                      <div className="grid grid-cols-4 gap-2">
                        {["👩‍💼", "🧑", "🧔", "👩‍🎨", "👮", "🧑‍💻", "👩‍🔬", "👤"].map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setSelectedCharacter(avatar)}
                            className={`h-12 flex items-center justify-center rounded-xl border-2 transition-all text-2xl ${selectedCharacter === avatar ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <MotionPresetPicker value={motionPresetIds} onChange={setMotionPresetIds} />
                  <FrameAnchorsPicker
                    startFrameUrl={startFrameUrl}
                    endFrameUrl={endFrameUrl}
                    onStartChange={setStartFrameUrl}
                    onEndChange={setEndFrameUrl}
                    suggestedUrl={getProductImageUrl(selectedProduct)}
                  />
                  <GeneratedPromptPanel generated={generatedPrompt} override={promptOverride} onOverrideChange={setPromptOverride} />
                  <Button className="w-full gap-2 bg-gradient-primary text-primary-foreground h-11" onClick={() => setStep("preview")}><Play className="w-4 h-4" />Pré-visualizar</Button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-surface-1 p-8">
                  <div className={`${ASPECT_PREVIEW[aspectRatio]} w-full max-w-[340px] rounded-2xl bg-card border-2 border-border overflow-hidden relative flex flex-col items-center justify-center`}>
                    <VideoPreviewAnimation templateId={creationMode === "template" ? selectedTemplate : "minimal"} productImage={getProductImageUrl(selectedProduct)} productName={selectedProduct.name} characterAvatar={selectedCharacter} />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card via-card/80 to-transparent z-30"><p className="text-xs font-display font-bold text-foreground truncate">{selectedProduct.name}</p><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-mono text-primary">{aspectRatio}</span><span className="text-[10px] text-muted-foreground">·</span><span className="text-[10px] text-muted-foreground">{duration}s</span></div></div>
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30"><span className="text-[8px] font-mono text-muted-foreground bg-surface-1/80 px-1.5 py-0.5 rounded">{creationMode === "template" ? selectedTemplateMeta?.name : "IA Gen"}</span><span className="text-[8px] font-mono text-primary bg-surface-1/80 px-1.5 py-0.5 rounded">PREVIEW</span></div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "preview" && selectedProduct && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-8">
                <div className={`${ASPECT_PREVIEW[aspectRatio]} w-full max-w-[400px] rounded-2xl bg-card border-2 border-border overflow-hidden relative flex items-center justify-center mb-6`}>
                  <VideoPreviewAnimation templateId={creationMode === "template" ? selectedTemplate : "minimal"} productImage={getProductImageUrl(selectedProduct)} productName={selectedProduct.name} characterAvatar={selectedCharacter} />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card to-transparent z-30"><p className="text-sm font-display font-bold text-foreground">{selectedProduct.name}</p><p className="text-[10px] text-muted-foreground mt-1">{aspectRatio} · {duration}s · {videoStyle} · {creationMode === "template" ? selectedTemplateMeta?.name : "IA"}</p></div>
                </div>
                <div className="text-center space-y-3 max-w-md">
                  <h2 className="text-lg font-display font-bold text-foreground">Pronto para gerar</h2>
                  <p className="text-sm text-muted-foreground">{creationMode === "template" ? `O template "${selectedTemplateMeta?.name}" será aplicado com estilo ${videoStyle}.` : `A IA irá gerar um vídeo com estilo ${videoStyle}.`}</p>
                  <div className="rounded-lg border border-border bg-surface-2 p-3 text-left">
                    <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Prompt final</p>
                    <p className="max-h-28 overflow-y-auto font-mono text-[11px] leading-relaxed text-foreground">{finalPrompt}</p>
                  </div>
                  {job && (
                    <div className="rounded-lg border border-border bg-surface-2 p-3 text-left" role="status" aria-live="polite">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status do job</p>
                      <p className="text-xs font-semibold text-foreground">{JOB_STATUS_LABELS[job.status]}</p>
                      {job.error_message && (
                        <p className="mt-1 text-[11px] text-destructive">{job.error_message}</p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep("config")} className="gap-1.5"><ChevronLeft className="w-3.5 h-3.5" /> Ajustar</Button>
                    {isPolling && job ? (
                      <Button variant="outline" className="gap-2 px-6" onClick={() => cancel(job.id)}>
                        <Loader2 className="w-4 h-4 animate-spin" /> Cancelar geração
                      </Button>
                    ) : (
                      <Button
                        className="gap-2 bg-gradient-accent text-accent-foreground px-6"
                        disabled={isEnqueuing || !currentOrgId || finalPrompt.length < 10}
                        onClick={() =>
                          currentOrgId &&
                          enqueue({
                            organizationId: currentOrgId,
                            name: selectedProduct.name,
                            productName: selectedProduct.name,
                            productSku: selectedProduct.sku ?? null,
                            prompt: finalPrompt,
                            aspectRatio,
                            duration,
                            style: videoStyle,
                            motionPresets: motionPresetIds,
                            startFrameUrl: validStartFrame,
                            endFrameUrl: validEndFrame,
                            characterRef:
                              selectedTemplate === "ambassador" && creationMode === "template"
                                ? {
                                    label: soulLabel,
                                    avatar: selectedCharacter,
                                    description: CHARACTER_DESCRIPTIONS[selectedCharacter] ?? null,
                                  }
                                : null,
                          })
                        }
                      >
                        {isEnqueuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Gerar Vídeo
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VideoNew;
