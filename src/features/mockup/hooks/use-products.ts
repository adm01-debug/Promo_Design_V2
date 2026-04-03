import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/external-supabase";
import type { DbProduct, DbProductImage, DbPrintAreaTechnique, DbCategory, DbProductVariant } from "@/lib/db-types";

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
    queryFn: async () => {
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
      if (error) throw error;
      return { products: (data || []) as DbProduct[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch single product with full details */
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await externalSupabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data as DbProduct;
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
      const { data, error } = await externalSupabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as DbProductImage[];
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
      const { data, error } = await externalSupabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as DbProductVariant[];
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
      const { data, error } = await externalSupabase
        .from("print_area_techniques")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("location_order");
      if (error) throw error;
      return (data || []) as DbPrintAreaTechnique[];
    },
    enabled: !!productId,
  });
}

/** Fetch categories */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from("categories")
        .select("id,name,slug,parent_id,image_url,is_active,level,full_path_readable,products_count")
        .eq("is_active", true)
        .gt("products_count", 0)
        .order("name");
      if (error) throw error;
      return (data || []) as DbCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Get best image URL for a product */
export function getProductImageUrl(product: Pick<DbProduct, "primary_image_url" | "image_url">): string {
  return product.primary_image_url || product.image_url || "/placeholder.svg";
}
