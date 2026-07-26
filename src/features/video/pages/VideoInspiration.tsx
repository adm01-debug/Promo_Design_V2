import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Search, Wand2, Clock, Film, Flame, Link2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INSPIRATION_RECIPES,
  INSPIRATION_CATEGORY_LABELS,
  buildRemixState,
  buildRecipeDeepLink,
  filterInspirationRecipes,
  sanitizeRecipePresetIds,
  type InspirationCategory,
  type InspirationRecipe,
} from "@/features/video/lib/inspiration-recipes";
import { getMotionPreset } from "@/features/video/lib/motion-presets";
import { VIDEO_STYLES } from "@/features/video/components/VideoNewConstants";
import { logRemixApplied } from "@/features/video/lib/remix-telemetry";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { useRemixPopularity, type RemixPopularityItem } from "@/features/video/hooks/use-remix-popularity";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useClientDesignRecommendation } from "@/features/mockup/hooks/use-client-design-recommendation";
import {
  rankRecipesForClient,
  indexAffinityById,
  type RecipeAffinity,
} from "@/features/video/lib/recipe-affinity";


const CATEGORIES: (InspirationCategory | "all")[] = [
  "all",
  "produto",
  "lifestyle",
  "promocional",
  "cinematografico",
  "social",
];

const styleLabel = (value: string) =>
  VIDEO_STYLES.find((s) => s.value === value)?.label ?? value;

const RecipeCard = ({
  recipe,
  popularity,
  affinity,
  onRemix,
  onCopyLink,
}: {
  recipe: InspirationRecipe;
  popularity?: RemixPopularityItem;
  affinity?: RecipeAffinity;
  onRemix: (recipe: InspirationRecipe) => void;
  onCopyLink: (recipe: InspirationRecipe) => void;
}) => {
  const presets = sanitizeRecipePresetIds(recipe).map(getMotionPreset);
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-display font-semibold text-foreground">{recipe.title}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            {affinity && affinity.score > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-medium"
                title={`Afinidade com o cliente: ${affinity.reasons.join("; ")}`}
              >
                <Target className="w-3 h-3" aria-hidden="true" />
                {Math.round(affinity.score * 100)}%
              </span>
            )}
            {popularity && popularity.remixes > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent-foreground font-medium"
                title={`${popularity.remixes} remix(es) por ${popularity.uniqueUsers} usuário(s)`}
              >
                <Flame className="w-3 h-3" aria-hidden="true" />
                {popularity.remixes}
              </span>
            )}

            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">
              {recipe.aspectRatio}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{recipe.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) =>
            preset ? (
              <span
                key={preset.id}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                <preset.icon className="w-3 h-3" aria-hidden="true" />
                {preset.label}
              </span>
            ) : null,
          )}
        </div>
        <div className="mt-auto flex items-center gap-3 text-[10px] text-muted-foreground font-mono uppercase">
          <span className="inline-flex items-center gap-1">
            <Film className="w-3 h-3" aria-hidden="true" />
            {styleLabel(recipe.videoStyle)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {recipe.durationSeconds}s
          </span>
          <span>{INSPIRATION_CATEGORY_LABELS[recipe.category]}</span>
        </div>
      </div>
      <div className="p-3 border-t border-border bg-surface-1 flex gap-2">
        <Button
          size="sm"
          className="w-full text-xs gap-1.5 bg-gradient-primary text-primary-foreground"
          onClick={() => onRemix(recipe)}
          aria-label={`Remixar receita ${recipe.title}`}
        >
          <Wand2 className="w-3.5 h-3.5" aria-hidden="true" /> Remixar no Studio
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0"
          onClick={() => onCopyLink(recipe)}
          aria-label={`Copiar link da receita ${recipe.title}`}
          title="Copiar link compartilhável"
        >
          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
};

const VideoInspiration = () => {
  const navigate = useNavigate();
  const { currentOrgId } = useOrganizations();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InspirationCategory | "all">("all");
  const [sort, setSort] = useState<"curated" | "popular" | "client">("curated");
  const [clientId, setClientId] = useState<string | null>(null);
  const { data: popularity } = useRemixPopularity(currentOrgId ?? null, 30);
  const { clients } = useClients(currentOrgId ?? null);
  const { data: recommendation } = useClientDesignRecommendation(
    currentOrgId ?? null,
    clientId,
  );

  // Índice de afinidade: puro e memoizado — recalcula só quando o padrão muda.
  const affinityById = useMemo(
    () => indexAffinityById(rankRecipesForClient(recommendation)),
    [recommendation],
  );

  const recipes = useMemo(() => {
    const filtered = filterInspirationRecipes(INSPIRATION_RECIPES, { search, category });
    // Ordenação estável em todos os modos: empate mantém a ordem curada.
    if (sort === "popular" && popularity) {
      return filtered
        .map((recipe, index) => ({
          recipe,
          index,
          score: popularity.byRecipeId[recipe.id]?.remixes ?? 0,
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((entry) => entry.recipe);
    }
    if (sort === "client") {
      return filtered
        .map((recipe, index) => ({
          recipe,
          index,
          score: affinityById[recipe.id]?.score ?? 0,
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((entry) => entry.recipe);
    }
    return filtered;
  }, [search, category, sort, popularity, affinityById]);


  const handleRemix = (recipe: InspirationRecipe) => {
    // Telemetria fire-and-forget: nunca atrasa a navegação.
    void logRemixApplied(recipe, currentOrgId);
    // Query string + state: o state evita reprocessar e a query mantém o
    // deep link válido após reload, nova aba ou compartilhamento.
    navigate(buildRecipeDeepLink(recipe), { state: buildRemixState(recipe) });
  };

  const handleCopyLink = async (recipe: InspirationRecipe) => {
    const url = `${window.location.origin}${buildRecipeDeepLink(recipe)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: recipe.title });
    } catch {
      toast.error("Não foi possível copiar o link", { description: url });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-surface-1 border-b border-border flex items-center gap-3 px-4 shrink-0">
        <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
        <h1 className="text-sm font-display font-semibold text-foreground">Feed de Inspiração</h1>
        <span className="text-xs text-muted-foreground">
          {recipes.length} receita{recipes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-4 border-b border-border shrink-0 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por estilo, técnica ou tag..."
            aria-label="Buscar receitas de inspiração"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                category === value
                  ? "bg-primary/20 border-primary/40 text-primary font-medium"
                  : "bg-surface-2 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "all" ? "Todas" : INSPIRATION_CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>
        <select
          value={clientId ?? ""}
          onChange={(e) => setClientId(e.target.value || null)}
          aria-label="Cliente para sugestões personalizadas"
          className="text-[11px] px-2.5 py-1.5 rounded-md border border-border bg-surface-2 text-muted-foreground focus:outline-none focus-visible:border-primary max-w-[200px]"
        >
          <option value="">Todos os clientes</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1.5" role="group" aria-label="Ordenação do feed">
          {(["curated", "popular", "client"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
              className={`text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                sort === value
                  ? "bg-accent/20 border-accent/40 text-accent-foreground font-medium"
                  : "bg-surface-2 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "curated"
                ? "Curadoria"
                : value === "popular"
                  ? "Mais usadas"
                  : "Para o cliente"}
            </button>
          ))}
        </div>
      </div>
      {sort === "client" && (
        <p className="px-4 pb-3 text-[11px] text-muted-foreground shrink-0">
          {recommendation && recommendation.confidence > 0
            ? `Sugestões baseadas em ${recommendation.sampleSize} peça(s) (${recommendation.source === "client" ? "padrão do cliente" : "padrão da organização"}).`
            : "Ainda não há padrão histórico suficiente — exibindo a ordem curada."}
        </p>
      )}


      <div className="flex-1 overflow-auto p-4">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nenhuma receita encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                popularity={popularity?.byRecipeId[recipe.id]}
                affinity={affinityById[recipe.id]}

                onRemix={handleRemix}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInspiration;
