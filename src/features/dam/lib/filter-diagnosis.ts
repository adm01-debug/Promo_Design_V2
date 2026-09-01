import type { Asset, AssetType } from "../hooks/use-assets";
import type { DamFiltersState } from "../hooks/use-dam-filters";

const TYPE_LABELS: Record<AssetType, string> = {
  logo: "Logo",
  art: "Arte",
  photo: "Foto",
  mockup: "Mockup",
  document: "Documento",
  other: "Outro",
};

export type DiagnosisCauseKind =
  | "assetTypes"
  | "clientId"
  | "tags"
  | "includeArchived"
  | "search";

export interface DiagnosisCause {
  kind: DiagnosisCauseKind;
  message: string;
}

export interface DiagnoseOptions {
  /** Map of clientId -> client name for nicer messages. */
  clientNameById?: Record<string, string>;
}

/**
 * Returns a list of human-readable reasons (in pt-BR) explaining why
 * the given asset would be excluded by the current filter state.
 * If the asset would still pass, returns an empty array.
 */
export function diagnoseAssetRemoval(
  asset: Asset,
  state: DamFiltersState,
  options: DiagnoseOptions = {},
): DiagnosisCause[] {
  const causes: DiagnosisCause[] = [];

  if (state.assetTypes.length > 0 && !state.assetTypes.includes(asset.asset_type)) {
    const filterLabels = state.assetTypes.map((t) => TYPE_LABELS[t]).join(", ");
    const assetLabel = TYPE_LABELS[asset.asset_type];
    causes.push({
      kind: "assetTypes",
      message: `Filtro de tipo (${filterLabels}) exclui este asset (tipo: ${assetLabel}).`,
    });
  }

  if (state.clientId === "none" && asset.client_id) {
    causes.push({
      kind: "clientId",
      message: "Filtro de cliente (sem cliente) exclui este asset, que pertence a um cliente.",
    });
  } else if (
    state.clientId !== "all" &&
    state.clientId !== "none" &&
    asset.client_id !== state.clientId
  ) {
    const filterName = options.clientNameById?.[state.clientId] ?? "selecionado";
    const assetClientName = asset.client_id
      ? options.clientNameById?.[asset.client_id] ?? "outro cliente"
      : "sem cliente";
    causes.push({
      kind: "clientId",
      message: `Filtro de cliente (${filterName}) exclui este asset (${assetClientName}).`,
    });
  }

  if (state.tags.length > 0) {
    const assetTags = asset.tags ?? [];
    const lowerAssetTags = assetTags.map((t) => t.toLowerCase());
    const lowerFilterTags = state.tags.map((t) => t.toLowerCase());
    const matches = lowerFilterTags.filter((t) => lowerAssetTags.includes(t));
    const passes =
      state.tagsMode === "all"
        ? matches.length === lowerFilterTags.length
        : matches.length > 0;
    if (!passes) {
      const modeLabel = state.tagsMode === "all" ? "todas" : "qualquer";
      const have = assetTags.length > 0 ? assetTags.join(", ") : "nenhuma";
      causes.push({
        kind: "tags",
        message: `Filtro de tags exige [${state.tags.join(", ")}] (modo: ${modeLabel}); asset tem [${have}].`,
      });
    }
  }

  if (!state.includeArchived && asset.is_archived) {
    causes.push({
      kind: "includeArchived",
      message: "Asset está arquivado e o filtro 'incluir arquivados' está desligado.",
    });
  }

  const term = state.search.trim();
  if (term.length >= 3) {
    const lower = term.toLowerCase();
    const haystack = [
      asset.name,
      asset.description ?? "",
      ...(asset.tags ?? []),
      asset.ocr_text ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(lower)) {
      causes.push({
        kind: "search",
        message: `Busca "${term}" não corresponde ao nome, descrição, tags ou OCR deste asset.`,
      });
    }
  }

  return causes;
}