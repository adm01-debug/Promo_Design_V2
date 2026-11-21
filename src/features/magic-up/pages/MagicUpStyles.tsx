import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, Plus, Pencil, Trash2, Loader2, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ErrorLogger } from "@/lib/error-logger";
import { useMagicUpStyles, STYLE_SLUG_RE, type MagicUpStyle } from "@/features/magic-up";
import { DEFAULT_STYLE_OPTIONS } from "@/features/magic-up";

const MagicUpStyles = () => {
  const navigate = useNavigate();
  const { styles, isLoading, isError, error, create, update, remove } = useMagicUpStyles();

  const [editing, setEditing] = useState<MagicUpStyle | null>(null);
  const [form, setForm] = useState({ slug: "", name: "", emoji: "🎨", prompt: "" });
  const [confirmDelete, setConfirmDelete] = useState<MagicUpStyle | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRefs = useRef(new Map<string, HTMLButtonElement>());

  // Foco inicial no botão Cancelar (ação menos destrutiva) e retorno ao
  // disparador ao fechar. Escape também fecha — requisitos de dialog modal.
  useEffect(() => {
    if (!confirmDelete) return;
    deleteCancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDelete(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete]);

  const closeDelete = () => {
    setConfirmDelete(null);
    // Restaura o foco no botão que abriu o modal.
    const trigger = confirmDelete ? deleteTriggerRefs.current.get(confirmDelete.id) : null;
    if (trigger) requestAnimationFrame(() => trigger.focus());
  };

  const resetForm = () => setForm({ slug: "", name: "", emoji: "🎨", prompt: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.name || !form.prompt) {
      toast.error("Preencha slug, nome e prompt");
      return;
    }
    try {
      await create.mutateAsync(form);
      toast.success("Estilo criado com sucesso");
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar estilo";
      ErrorLogger.error("magic_up_style_create_failed", { message: msg });
      toast.error(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        patch: { slug: form.slug, name: form.name, emoji: form.emoji, prompt: form.prompt },
      });
      toast.success("Estilo atualizado");
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar estilo";
      ErrorLogger.error("magic_up_style_update_failed", { message: msg });
      toast.error(msg);
    }
  };

  const startEdit = (style: MagicUpStyle) => {
    setEditing(style);
    setForm({ slug: style.slug, name: style.name, emoji: style.emoji, prompt: style.prompt });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success("Estilo excluído");
      closeDelete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir estilo";
      ErrorLogger.error("magic_up_style_delete_failed", { message: msg });
      toast.error(msg);
    }
  };

  const slugError =
    form.slug && !STYLE_SLUG_RE.test(form.slug)
      ? "Apenas letras minúsculas, números e hifens (máx. 40)"
      : null;

  const formReady = Boolean(form.slug && form.name && form.prompt.trim().length >= 3 && !slugError);

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-display font-semibold text-foreground">Estilos — Magic Up</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
            {styles.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Form de criação / edição */}
        <form
          onSubmit={editing ? handleUpdate : handleCreate}
          className="rounded-xl border border-border bg-card p-4 space-y-3 max-w-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-foreground">
              {editing ? `Editando " ${editing.name} "` : "Novo estilo da marca"}
            </h2>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  resetForm();
                }}
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="style-slug">Slug</Label>
              <Input
                id="style-slug"
                placeholder="ex.: black-friday"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={Boolean(editing)}
                aria-invalid={Boolean(slugError)}
                aria-describedby={slugError ? "style-slug-error" : undefined}
              />
              {slugError && (
                <p id="style-slug-error" className="text-[10px] text-red-500">
                  {slugError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="style-name">Nome</Label>
              <Input
                id="style-name"
                placeholder="ex.: Black Friday"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="style-emoji">Emoji</Label>
              <Input
                id="style-emoji"
                placeholder="🎨"
                value={form.emoji}
                maxLength={4}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="style-prompt">
              Prompt (em inglês — instrução para o gerador de imagem)
            </Label>
            <Textarea
              id="style-prompt"
              rows={3}
              placeholder="ex.: black friday themed product photography, red and black accents, lightning bolt graphics, sales energy"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              aria-invalid={Boolean(form.prompt && form.prompt.trim().length < 3)}
              aria-describedby={
                form.prompt && form.prompt.trim().length < 3 ? "style-prompt-error" : undefined
              }
            />
            {form.prompt && form.prompt.trim().length < 3 && (
              <p id="style-prompt-error" className="text-[10px] text-red-500">
                Mínimo de 3 caracteres
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={!formReady || create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : editing ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {editing ? "Salvar alterações" : "Criar estilo"}
            </Button>
          </div>
        </form>

        {/* Lista de estilos da org */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando estilos...
          </div>
        ) : isError ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">
              Não foi possível carregar os estilos
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Tente novamente em instantes."}
            </p>
          </div>
        ) : styles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Palette className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum estilo personalizado ainda.</p>
            <p className="text-xs text-muted-foreground">
              Crie o primeiro estilo da sua marca acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map((style, i) => (
              <motion.div
                key={style.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card hover:border-primary/30 transition-colors p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{style.emoji}</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {style.name}
                      </h3>
                      <p className="text-[10px] font-mono text-muted-foreground">/{style.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Editar"
                      onClick={() => startEdit(style)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="sr-only">Editar {style.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      title="Excluir"
                      ref={(node) => {
                        if (node) deleteTriggerRefs.current.set(style.id, node);
                        else deleteTriggerRefs.current.delete(style.id);
                      }}
                      onClick={() => setConfirmDelete(style)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Excluir {style.name}</span>
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3">
                  {style.prompt}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-full gap-1.5 text-xs"
                  onClick={() => navigate("/magicup/generate", { state: { prompt: style.prompt } })}
                >
                  Usar no gerador
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Estilos de sistema (fallback) */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSystem(!showSystem)}
            className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Estilos padrão do sistema ({DEFAULT_STYLE_OPTIONS.length})
            <span className="text-[10px]">{showSystem ? "Ocultar" : "Ver"}</span>
          </button>
          {showSystem && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {DEFAULT_STYLE_OPTIONS.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg bg-surface-2 border border-border p-2 text-center"
                >
                  <span className="block text-xl">{s.emoji}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{s.label}</span>
                  <span className="block text-[10px] font-mono text-muted-foreground/60">
                    /{s.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          aria-describedby="confirm-delete-desc"
        >
          <div className="rounded-xl border border-border bg-card p-5 max-w-sm w-full shadow-lg">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 id="confirm-delete-title" className="text-sm font-semibold text-foreground">
                  Excluir estilo?
                </h3>
                <p id="confirm-delete-desc" className="text-xs text-muted-foreground mt-1">
                  "{confirmDelete.name}" será removido dos presets da organização. Gerações já
                  feitas permanecem no histórico.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                ref={deleteCancelRef}
                onClick={() => closeDelete()}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={handleDelete}
                disabled={remove.isPending}
              >
                {remove.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicUpStyles;
