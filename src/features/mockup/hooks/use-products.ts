import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/external-supabase";
import { supabase } from "@/integrations/supabase/client";
import type {
  DbProduct,
  DbProductImage,
  DbPrintAreaTechnique,
  DbCategory,
  DbProductVariant,
} from "../lib/db-types";

/** Colunas lidas de `product_variants` — a única tabela do catálogo externo liberada à chave anônima. */
const VARIANT_COLUMNS =
  "id,product_id,sku,name,color_name,color_hex,size_code,stock_quantity,images,selected_thumbnail";

/**
 * Converte as variações de um mesmo produto no formato `DbProduct` esperado pela UI.
 * Nome, SKU, cores, galeria e estoque são agregados das variações; os campos que só
 * existem na tabela `products` (bloqueada) ficam neutros em vez de derrubar a listagem.
 */
function variantGroupToProduct(productId: string, group: Record<string, unknown>[]): DbProduct {
  const images: string[] = [];
  const colors: string[] = [];
  let stock = 0;
  let name = "";
  let sku = "";

  for (const row of group) {
    const thumb = row.selected_thumbnail as string | null;
    const rowImages = Array.isArray(row.images) ? (row.images as string[]) : [];
    for (const url of [thumb, ...rowImages]) {
      if (url && !images.includes(url)) images.push(url);
    }
    const color = (row.color_name as string | null) || null;
    if (color && !colors.includes(color)) colors.push(color);
    stock += (row.stock_quantity as number) || 0;
    if (!name && typeof row.name === "string" && row.name) name = row.name;
    if (!sku && typeof row.sku === "string" && row.sku) sku = row.sku;
  }

  const primary = images[0] || null;
  return {
    id: productId,
    name,
    description: null,
    short_description: colors[0] ? `Disponível em ${colors.length} cor(es)` : null,
    sku,
    category_id: null,
    supplier_id: null,
    primary_image_url: primary,
    images,
    image_url: primary,
    allows_personalization: true,
    personalization_areas: [],
    engraving_type: null,
    colors,
    materials: [],
    dimensions: null,
    weight_g: null,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    diameter_cm: null,
    shape_type: null,
    is_active: true,
    stock_quantity: stock,
    brand: null,
    slug: sku.toLowerCase().replace(/\s+/g, "-"),
    is_kit: false,
    is_textil: false,
    has_colors: colors.length > 0,
    min_quantity: null,
    supply_mode: null,
  };
}

/** Agrupa variações por produto preservando a ordem de primeiro aparecimento. */
function variantRowsToProducts(rows: Record<string, unknown>[]): DbProduct[] {
  const byProduct = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const productId = row.product_id as string;
    if (!productId) continue;
    const group = byProduct.get(productId);
    if (group) group.push(row);
    else byProduct.set(productId, [row]);
  }
  return Array.from(byProduct.entries()).map(([productId, group]) =>
    variantGroupToProduct(productId, group),
  );
}

/**
 * Lê o catálogo externo em dois passos.
 *
 * Passo 1 resolve a página de IDs em `products` (onde só `id` é legível) — ou, quando há
 * busca, em `product_variants.name`, que é o único caminho com nome acessível.
 * Passo 2 enriquece esses IDs com as variações, que trazem galeria, cores e estoque.
 *
 * Retorna `null` quando o projeto externo não responde, para o caller cair no fallback.
 */
async function fetchExternalProducts(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ products: DbProduct[]; total: number } | null> {
  const { search = "", page = 0, pageSize = 20 } = opts;
  const from = page * pageSize;

  let ids: string[];
  let total: number;

  if (search) {
    // `products.name` é ilegível; a busca acontece nas variações e devolve os produtos
    // que têm ao menos uma cor/variante casando com o termo.
    const { data: hits, error } = await externalSupabase
      .from("product_variants")
      .select("product_id")
      .ilike("name", `%${search}%`)
      .eq("is_active", true)
      .limit(200);
    if (error) {
      console.warn("[useProducts] Busca no catálogo externo falhou:", error.message);
      return null;
    }
    const unique = Array.from(
      new Set((hits as { product_id: string | null }[]).map((r) => r.product_id).filter(Boolean)),
    ) as string[];
    total = unique.length;
    ids = unique.slice(from, from + pageSize);
  } else {
    const {
      data: idRows,
      error,
      count,
    } = await externalSupabase
      .from("products")
      .select("id", { count: "exact" })
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn("[useProducts] Catálogo externo indisponível:", error.message);
      return null;
    }
    ids = (idRows as { id: string }[]).map((r) => r.id);
    total = count || 0;
  }

  if (ids.length === 0) return { products: [], total };

  const { data: variantRows, error: variantError } = await externalSupabase
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .in("product_id", ids)
    .eq("is_active", true);
  if (variantError) {
    console.warn("[useProducts] Variações indisponíveis:", variantError.message);
    return null;
  }

  const products = variantRowsToProducts(variantRows as Record<string, unknown>[]);
  // Preserva a ordem da página de IDs; produtos sem variação ativa ainda aparecem.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is DbProduct => Boolean(p));

  return { products: ordered, total };
}

/**
 * Busca produtos priorizando o catálogo externo e caindo para `catalog_products`
 * do projeto principal apenas se o externo estiver fora do ar.
 */
async function fetchProductsWithFallback(opts: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  onlyWithImages?: boolean;
}): Promise<{ products: DbProduct[]; total: number }> {
  const { onlyWithImages = false } = opts;

  // Cache por aba: se o externo falhou, não repetir a tentativa a cada render.
  const cacheKey = `external_supabase_failed_${opts.page}_${opts.pageSize}`;
  if (typeof window !== "undefined" && sessionStorage.getItem(cacheKey)) {
    return fallbackToMain(opts);
  }

  try {
    const result = await fetchExternalProducts(opts);
    if (!result) {
      if (typeof window !== "undefined") sessionStorage.setItem(cacheKey, "1");
      return fallbackToMain(opts);
    }
    if (result.products.length === 0 && !result.total) {
      return fallbackToMain(opts);
    }
    // `onlyWithImages` é aplicado aqui porque o filtro no banco dependia de
    // `products.primary_image_url`, coluna que a chave anônima não lê.
    const products = onlyWithImages
      ? result.products.filter((p) => Boolean(p.primary_image_url || p.image_url))
      : result.products;
    return { products, total: result.total };
  } catch (err: unknown) {
    console.warn(
      "[useProducts] Catálogo externo lançou exceção:",
      err instanceof Error ? err.message : err,
    );
    if (typeof window !== "undefined") sessionStorage.setItem(cacheKey, "1");
    return fallbackToMain(opts);
  }
}

/**
 * Fallback: buscar produtos do Supabase principal (catalog_products)
 */
async function fallbackToMain(opts: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  onlyWithImages?: boolean;
}): Promise<{ products: DbProduct[]; total: number }> {
  const { search = "", page = 0, pageSize = 20, onlyWithImages = false } = opts;
  try {
    let q = supabase
      .from("catalog_products")
      .select(
        "id,name,sku,material,colors,image_url,user_id,organization_id,active,created_at,updated_at",
        { count: "exact" },
      )
      .eq("active", true)
      .order("name")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (search) {
      q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (onlyWithImages) {
      q = q.not("image_url", "is", null);
    }

    const { data, error, count } = await q;
    if (error) {
      console.error("[useProducts] Fallback also failed:", error.message);
      return { products: [], total: 0 };
    }

    // Adaptar para DbProduct
    const products: DbProduct[] = (data || []).map((row: unknown) => {
      const p = row as Record<string, unknown>;
      return {
        id: p.id as string,
        name: p.name as string,
        description: (p.material as string | null) ?? null,
        short_description: (p.material as string) || "",
        sku: p.sku as string,
        category_id: null,
        supplier_id: null,
        primary_image_url: p.image_url as string | null,
        images: [],
        image_url: p.image_url as string | null,
        allows_personalization: true,
        personalization_areas: [],
        engraving_type: null,
        colors: (p.colors as string[] | null) ?? [],
        materials: [],
        dimensions: null,
        weight_g: null,
        length_cm: null,
        width_cm: null,
        height_cm: null,
        diameter_cm: null,
        shape_type: null,
        is_active: p.active as boolean,
        stock_quantity: 0,
        brand: null,
        slug: (p.sku as string | undefined)?.toLowerCase().replace(/\s+/g, "-") || "",
        is_kit: false,
        is_textil: false,
        has_colors: false,
        min_quantity: 50,
        supply_mode: null,
      };
    });

    return { products, total: count || 0 };
  } catch (err: unknown) {
    console.error("[useProducts] Fallback exception:", err instanceof Error ? err.message : err);
    return { products: [], total: 0 };
  }
}

/** Fetch active products with pagination and search */
export function useProducts(options?: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  onlyWithImages?: boolean;
}) {
  const {
    search = "",
    categoryId,
    page = 0,
    pageSize = 20,
    onlyWithImages = false,
  } = options || {};

  return useQuery({
    queryKey: ["products", search, categoryId, page, pageSize, onlyWithImages],
    queryFn: () =>
      fetchProductsWithFallback({ search, categoryId, page, pageSize, onlyWithImages }),
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch single product with full details */
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      try {
        // `products` só expõe id/is_active/is_deleted para a chave anônima;
        // a variação carrega nome, SKU e imagens.
        const { data, error } = await externalSupabase
          .from("product_variants")
          .select(VARIANT_COLUMNS)
          .eq("product_id", productId)
          .eq("is_active", true);
        if (!error && data) {
          const products = variantRowsToProducts(data as Record<string, unknown>[]);
          if (products.length > 0) return products[0];
        }
      } catch {
        // Fallback abaixo
      }
      // Fallback para catalog_products
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) return null;
      return data as unknown as DbProduct;
    },
    enabled: !!productId,
  });
}

/** Fetch product images */
export function useProductImages(productId: string | null) {
  return useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      if (!productId) return [];
      try {
        // `product_images` também está bloqueada para a chave anônima; as imagens
        // vivem em `product_variants.images`.
        const { data, error } = await externalSupabase
          .from("product_variants")
          .select("images")
          .eq("product_id", productId)
          .eq("is_active", true);
        if (!error && data) {
          const urls = new Set<string>();
          for (const row of data as { images?: string[] | null }[]) {
            for (const url of row.images || []) if (url) urls.add(url);
          }
          return Array.from(urls).map(
            (url, i) =>
              ({
                id: url,
                product_id: productId,
                variant_id: null,
                color_id: null,
                url_cdn: url,
                url_original: url,
                filename: url.split("/").pop() || url,
                image_type: i === 0 ? "main" : "detail",
                is_primary: i === 0,
                display_order: i,
                applies_to_color: false,
                alt_text: null,
                title_text: null,
                is_active: true,
              }) as DbProductImage,
          );
        }
      } catch {
        // Fallback abaixo
      }
      // Sem fallback para imagens - retornar vazio
      return [];
    },
    enabled: !!productId,
  });
}

/** Fetch product variants */
export function useProductVariants(productId: string | null) {
  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId) return [];
      try {
        const { data, error } = await externalSupabase
          .from("product_variants")
          .select(
            "id,product_id,sku,name,attributes,stock_quantity,color_id,color_name,color_hex,size_code,images,selected_thumbnail,is_active",
          )
          .eq("product_id", productId)
          .eq("is_active", true);
        if (!error && data) {
          return (data as Record<string, unknown>[]).map((row) => ({
            ...(row as unknown as DbProductVariant),
            // `selected_thumbnail` é a foto curada da variação; usar como fallback
            // quando a variação não tem galeria própria.
            selected_thumbnail:
              (row.selected_thumbnail as string | null) ||
              ((row.images as string[] | null) || [])[0] ||
              null,
          })) as DbProductVariant[];
        }
      } catch {
        // Fallback abaixo
      }
      // Sem fallback para variants
      return [];
    },
    enabled: !!productId,
  });
}

/** Fetch print area techniques (personalization areas) */
export function usePrintAreaTechniques(productId: string | null) {
  return useQuery({
    queryKey: ["print-areas", productId],
    queryFn: async () => {
      if (!productId) return [];
      try {
        const { data, error } = await externalSupabase
          .from("print_area_techniques")
          .select("*")
          .eq("product_id", productId)
          .eq("is_active", true)
          .order("location_order");
        if (!error && data) return data as DbPrintAreaTechnique[];
      } catch {
        // Fallback abaixo
      }
      // Sem fallback para print areas
      return [];
    },
    enabled: !!productId,
  });
}

/** Fetch categories */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const { data, error } = await externalSupabase
          .from("categories")
          .select(
            "id,name,slug,parent_id,image_url,is_active,level,full_path_readable,products_count",
          )
          .eq("is_active", true)
          .gt("products_count", 0)
          .order("name");
        if (!error && data) return data as DbCategory[];
      } catch {
        // Fallback abaixo
      }
      // Fallback: usar product_categories do Supabase principal
      const { data, error } = await supabase
        .from("product_categories")
        .select("id,name,description,user_id,organization_id,created_at")
        .order("name");
      if (error) return [];
      return (data || []).map((row: unknown) => {
        const c = row as Record<string, unknown>;
        return {
          id: c.id as string,
          name: c.name as string,
          slug: (c.name as string).toLowerCase().replace(/\s+/g, "-"),
          parent_id: null,
          image_url: null,
          is_active: true,
          level: 0,
          full_path_readable: c.name,
          products_count: 0,
        };
      }) as DbCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Get best image URL for a product */
export function getProductImageUrl(
  product: Pick<DbProduct, "primary_image_url" | "image_url">,
): string {
  return product.primary_image_url || product.image_url || "/placeholder.svg";
}
