import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  material: string | null;
  colors: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

function rowToProduct(row: Tables<"catalog_products">, categories?: ProductCategory[]): CatalogProduct {
  const cat = categories?.find((c) => c.id === row.category_id);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    material: row.material,
    colors: row.colors,
    imageUrl: row.image_url,
    categoryId: row.category_id,
    categoryName: cat?.name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCategory(row: Tables<"product_categories">): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function useCatalog() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["catalog-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(rowToCategory);
    },
    enabled: !!user,
  });

  const productsQuery = useQuery({
    queryKey: ["catalog-products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any) => rowToProduct(r, categoriesQuery.data));
    },
    enabled: !!user && categoriesQuery.isSuccess,
  });

  // --- Mutations ---
  const addProduct = useMutation({
    mutationFn: async (p: { name: string; sku?: string; material?: string; colors?: string; imageUrl?: string; categoryId?: string }) => {
      const { error } = await supabase.from("catalog_products").insert({
        user_id: user!.id,
        name: p.name,
        sku: p.sku || null,
        material: p.material || null,
        colors: p.colors || null,
        image_url: p.imageUrl || null,
        category_id: p.categoryId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-products"] }),
  });

  const updateProduct = useMutation({
    mutationFn: async (p: { id: string; name: string; sku?: string; material?: string; colors?: string; imageUrl?: string; categoryId?: string; active?: boolean }) => {
      const { error } = await supabase.from("catalog_products").update({
        name: p.name,
        sku: p.sku || null,
        material: p.material || null,
        colors: p.colors || null,
        image_url: p.imageUrl || null,
        category_id: p.categoryId || null,
        active: p.active ?? true,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-products"] }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catalog_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-products"] }),
  });

  const addCategory = useMutation({
    mutationFn: async (c: { name: string; description?: string }) => {
      const { error } = await supabase.from("product_categories").insert({
        user_id: user!.id,
        name: c.name,
        description: c.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-categories"] });
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
    },
  });

  return {
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading: productsQuery.isLoading || categoriesQuery.isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
  };
}
