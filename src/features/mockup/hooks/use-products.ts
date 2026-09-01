import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/external-supabase";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct, DbProductImage, DbPrintAreaTechnique, DbCategory, DbProductVariant } from "../lib/db-types";

/**
 * Adapter que busca produtos no Supabase externo.
 * Em caso de falha (400/permission denied/coluna inexistente), faz fallback automático
 * para a tabela catalog_products do Supabase principal.
 */
async function fetchProductsWithFallback(opts: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  onlyWithImages?: boolean;
}): Promise<{ products: DbProduct[]; total: number }> {
  const { search = "", categoryId, page = 0, pageSize = 20, onlyWithImages = false } = opts;

  // Cache estático para evitar repetir tentativas falhas durante a sessão
  // (não usar em produção real - apenas para resiliência durante desenvolvimento)
  const cacheKey = `external_supabase_failed_${opts.page}_${opts.pageSize}`;
  if (typeof window !== "undefined" && sessionStorage.getItem(cacheKey)) {
    return fallbackToMain(opts);
  }

  // Tentar primeiro no Supabase externo (catálogo de 6.100+ produtos)
  try {
    let query = externalSupabase
      .from("products")
      .select("id,name,short_description,sku,primary_image_url,category_id,allows_personalization,engraving_type,colors,dimensions,shape_type,width_cm,height_cm,length_cm,diameter_cm,is_kit,brand,slug,supply_mode,min_quantity,stock_quantity", { count: "exact" })
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("name")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    if (onlyWithImages) {
      query = query.not("primary_image_url", "is", null);
    }

    const { data, error, count } = await query;
    if (error) {
      console.warn("[useProducts] External Supabase failed:", error.message);
      // Marcar como falho para a sessão (evita retries)
      if (typeof window !== "undefined") sessionStorage.setItem(cacheKey, "1");
      return fallbackToMain(opts);
    }
    if (data && data.length > 0) {
      return { products: data as DbProduct[], total: count || 0 };
    }
    return fallbackToMain(opts);
  } catch (err: any) {
    console.warn("[useProducts] External Supabase exception:", err?.message || err);
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
      .select("id,name,sku,material,colors,image_url,user_id,organization_id,active,created_at,updated_at", { count: "exact" })
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
    const products: DbProduct[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      short_description: p.material || "",
      primary_image_url: p.image_url,
      colors: p.colors,
      is_active: p.active,
      category_id: null,
      allows_personalization: true,
      engraving_type: null,
      dimensions: null,
      shape_type: null,
      width_cm: null,
      height_cm: null,
      length_cm: null,
      diameter_cm: null,
      is_kit: false,
      brand: null,
      slug: p.sku?.toLowerCase().replace(/\s+/g, "-") || "",
      supply_mode: null,
      min_quantity: 50,
      stock_quantity: null,
    }));

    return { products, total: count || 0 };
  } catch (err: any) {
    console.error("[useProducts] Fallback exception:", err?.message || err);
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
  const { search = "", categoryId, page = 0, pageSize = 20, onlyWithImages = false } = options || {};

  return useQuery({
    queryKey: ["products", search, categoryId, page, pageSize, onlyWithImages],
    queryFn: () => fetchProductsWithFallback({ search, categoryId, page, pageSize, onlyWithImages }),
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
        const { data, error } = await externalSupabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();
        if (!error && data) return data as DbProduct;
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
        const { data, error } = await externalSupabase
          .from("product_images")
          .select("*")
          .eq("product_id", productId)
          .eq("is_active", true)
          .order("display_order");
        if (!error && data) return data as DbProductImage[];
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
          .select("*")
          .eq("product_id", productId)
          .eq("is_active", true);
        if (!error && data) return data as DbProductVariant[];
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
          .select("id,name,slug,parent_id,image_url,is_active,level,full_path_readable,products_count")
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
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.name.toLowerCase().replace(/\s+/g, "-"),
        parent_id: null,
        image_url: null,
        is_active: true,
        level: 0,
        full_path_readable: c.name,
        products_count: 0,
      })) as DbCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Get best image URL for a product */
export function getProductImageUrl(product: Pick<DbProduct, "primary_image_url" | "image_url">): string {
  return product.primary_image_url || product.image_url || "/placeholder.svg";
}