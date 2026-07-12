/**
 * Types matching the external Supabase database schema
 */

// === PRODUCTS ===
export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sku: string;
  category_id: string | null;
  supplier_id: string | null;
  primary_image_url: string | null;
  images: string[];
  image_url: string | null;
  allows_personalization: boolean;
  personalization_areas: unknown[];
  engraving_type: string | null;
  colors: string[];
  materials: string[];
  dimensions: {
    width_cm?: number;
    height_cm?: number;
    length_cm?: number;
    shape_type?: string;
    diameter_cm?: number;
  } | null;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  diameter_cm: number | null;
  shape_type: string | null;
  is_active: boolean;
  stock_quantity: number;
  brand: string | null;
  slug: string;
  is_kit: boolean;
  is_textil: boolean;
  has_colors: boolean;
  min_quantity: number | null;
  supply_mode: string | null;
}

// === PRODUCT IMAGES ===
export interface DbProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  color_id: string | null;
  url_cdn: string;
  url_original: string | null;
  filename: string;
  image_type: string; // "main", "detail", etc.
  is_primary: boolean;
  display_order: number;
  applies_to_color: boolean;
  alt_text: string | null;
  title_text: string | null;
  is_active: boolean;
}

// === PRODUCT VARIANTS ===
export interface DbProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, any>;
  stock_quantity: number;
  color_name: string | null;
  color_hex: string | null;
  selected_thumbnail: string | null;
  is_active: boolean;
}

// === PRINT AREA TECHNIQUES (áreas de personalização) ===
export interface DbPrintAreaTechnique {
  id: string;
  product_id: string;
  tabela_preco_id: string;
  max_width: number;
  max_height: number;
  is_curved: boolean;
  shape: string; // "rectangle", "circle", etc.
  location_code: string; // "LADO-A", "LADO-B", "TAMPA", etc.
  location_name: string; // "Lado A", "Lado B", "Tampa"
  location_order: number;
  gravacao_largura_max: number;
  gravacao_altura_max: number;
  is_active: boolean;
}

// === CATEGORIES ===
export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  level: number;
  full_path_readable: string | null;
  products_count: number;
}

// === SUPPLIERS ===
export interface DbSupplier {
  id: string;
  name: string;
}

// === VIEW: Category Target Audiences ===
export interface DbCategoryTargetAudience {
  id: string;
  category_id: string;
  category_name: string;
  target_audience_id: string;
  audience_name: string;
  audience_type: string;
  audience_slug: string;
  relevance_score: number;
  is_primary: boolean;
}
