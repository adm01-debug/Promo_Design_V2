/**
 * Tipos do catálogo externo de produtos (`doufsxqlfjyuvxuezpln`).
 *
 * O Design **apenas replica** esse catálogo: nada no app escreve nele, por isso
 * `Insert`/`Update` são `never` — uma escrita acidental passa a ser erro de
 * compilação em vez de 401 em produção.
 *
 * A RLS do projeto externo é **por coluna**. Toda coluna abaixo foi verificada
 * contra a API REST com a mesma chave anônima usada pelo app
 * (`src/lib/external-supabase.ts`). Coluna sem `GRANT` devolve 401 no `select` e
 * coluna inexistente devolve 400 — foi assim que a lista foi fechada:
 *
 * - `product_variants`: 41 colunas legíveis. Tipos e nulabilidade derivados de
 *   amostra de 300 linhas + contagem exata de nulos (`Prefer: count=exact`).
 * - `categories`: 35 colunas legíveis, mesma metodologia.
 * - `print_area_techniques`: 13 colunas legíveis. `gravacao_largura_max` e
 *   `gravacao_altura_max` **não existem** nessa tabela (HTTP 400), por isso não
 *   aparecem — elas só existiam no tipo local `DbPrintAreaTechnique`.
 * - `products`: somente `id`, `is_active` e `is_deleted` são legíveis. Manter
 *   apenas essas três faz o compilador recusar `select("name")` (que devolve 401)
 *   em vez de o erro aparecer em produção.
 * - `product_images`: bloqueada por inteiro (401) e não usada — as imagens vêm de
 *   `product_variants.images`.
 *
 * Nulabilidade: coluna com zero nulos na tabela inteira é tipada não-nula. As que
 * nunca receberam valor (`bitrix_modified_at`, `synced_at`, `created_by`,
 * `updated_by`, `next_quantity_5/6`, `next_date_5/6`) são tipadas pelo nome/data
 * esperada e marcadas como nulas.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Tabela espelhada: leitura liberada, escrita nunca. */
type ReadOnlyTable<Row> = {
  Row: Row;
  Insert: never;
  Update: never;
  Relationships: [];
};

export type ExternalProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Json;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sku_promo: string | null;
  color_id: string | null;
  size_id: string | null;
  supplier_sku: string | null;
  color_code: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  capacity_ml: number | null;
  last_sync_at: string | null;
  last_sync_supplier_id: string | null;
  selected_thumbnail: string | null;
  bitrix_product_id: number | null;
  CodigoXbz: string | null;
  size_length_cm: number | null;
  size_width_cm: number | null;
  next_quantity_1: number | null;
  next_date_1: string | null;
  next_quantity_2: number | null;
  next_date_2: string | null;
  next_quantity_3: number | null;
  next_date_3: string | null;
  next_quantity_4: number | null;
  next_date_4: string | null;
  next_quantity_5: number | null;
  next_date_5: string | null;
  next_quantity_6: number | null;
  next_date_6: string | null;
  next_entry_date: string | null;
  next_entry_quantity: number | null;
  supplier_external_id: string | null;
};

export type ExternalCategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  slug: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  updated_at: string;
  organization_id: string;
  bitrix_id: number | null;
  bitrix_modified_at: string | null;
  synced_at: string | null;
  sync_status: string;
  level: number;
  path: string;
  is_visible: boolean;
  color_hex: string | null;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[] | null;
  products_count: number;
  children_count: number;
  descendants_count: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  full_path_readable: string;
  ai_summary: string;
  schema_json: Json;
  seo_priority: number;
  min_order_quantity: number;
  active: boolean;
};

export type ExternalPrintAreaTechniqueRow = {
  id: string;
  product_id: string;
  tabela_preco_id: string;
  max_width: number;
  max_height: number;
  is_curved: boolean;
  shape: string;
  location_code: string;
  location_name: string | null;
  location_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExternalProductRow = {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
};

/** Colunas que o app lê de `product_variants` (ver `VARIANT_COLUMNS`). */
export type ExternalVariantListing = Pick<
  ExternalProductVariantRow,
  | "id"
  | "product_id"
  | "sku"
  | "name"
  | "color_name"
  | "color_hex"
  | "size_code"
  | "stock_quantity"
  | "images"
  | "selected_thumbnail"
>;

export type ExternalDatabase = {
  public: {
    Tables: {
      product_variants: ReadOnlyTable<ExternalProductVariantRow>;
      categories: ReadOnlyTable<ExternalCategoryRow>;
      print_area_techniques: ReadOnlyTable<ExternalPrintAreaTechniqueRow>;
      products: ReadOnlyTable<ExternalProductRow>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
