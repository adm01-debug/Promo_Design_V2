import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export type OsStatus = "aberta" | "em_producao" | "concluida" | "cancelada";

// ─── State Machine: transições válidas de status ───────────
export const STATUS_TRANSITIONS: Record<OsStatus, OsStatus[]> = {
  aberta: ["em_producao", "cancelada"],
  em_producao: ["concluida", "cancelada"],
  concluida: [],
  cancelada: ["aberta"],
};

export function canTransition(from: OsStatus, to: OsStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(current: OsStatus): OsStatus[] {
  return STATUS_TRANSITIONS[current] ?? [];
}

export interface StoredServiceOrder {
  id: string;
  osNumber: string;
  status: OsStatus;
  date: string;
  deliveryDate: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  clientEmail: string;
  productName: string;
  productSku: string;
  productMaterial: string;
  productColors: string;
  technique: string;
  areaName: string;
  areaWidth: string;
  areaHeight: string;
  areaShape: string;
  artColors: string;
  artDpi: string;
  artFile: string;
  artFileDataUrl: string;
  quantity: string;
  observations: string;
  mockupImageUrl: string;
  identificacaoCaixa: string;
  materialEvento: boolean;
  aprovarPrimeiraPeca: boolean;
  qtdCompra: string;
  qtdLiberada: string;
  fazParteKit: boolean;
  gravacaoDetalhe: string;
  artAssetId?: string | null;
  lockVersion: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function rowToOrder(row: Tables<"service_orders">): StoredServiceOrder {
  return {
    id: row.id,
    osNumber: row.os_number,
    status: row.status as OsStatus,
    date: row.date,
    deliveryDate: row.delivery_date ?? "",
    clientName: row.client_name,
    clientCompany: row.client_company ?? "",
    clientPhone: row.client_phone ?? "",
    clientEmail: row.client_email ?? "",
    productName: row.product_name,
    productSku: row.product_sku ?? "",
    productMaterial: row.product_material ?? "",
    productColors: row.product_colors ?? "",
    technique: row.technique,
    areaName: row.area_name ?? "",
    areaWidth: row.area_width ?? "",
    areaHeight: row.area_height ?? "",
    areaShape: row.area_shape ?? "",
    artColors: row.art_colors ?? "",
    artDpi: row.art_dpi ?? "",
    artFile: row.art_file ?? "",
    artFileDataUrl: row.art_file_data_url ?? "",
    quantity: String(row.quantity),
    observations: row.observations ?? "",
    mockupImageUrl: row.mockup_image_url ?? "",
    identificacaoCaixa: row.identificacao_caixa ?? "",
    materialEvento: row.material_evento ?? false,
    aprovarPrimeiraPeca: row.aprovar_primeira_peca ?? false,
    qtdCompra: row.qtd_compra ?? "",
    qtdLiberada: row.qtd_liberada ?? "",
    fazParteKit: row.faz_parte_kit ?? false,
    gravacaoDetalhe: row.gravacao_detalhe ?? "",
    artAssetId: (row as unknown as { art_asset_id?: string | null }).art_asset_id ?? null,
    lockVersion: (row as any).lock_version ?? 1,
    deletedAt: (row as any).deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UseServiceOrdersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OsStatus | "all";
  sortAsc?: boolean;
  /** Optional product name/SKU substring filter (case-insensitive). */
  productQuery?: string;
  /** Lower bound (inclusive) for `created_at`, ISO string. */
  dateFrom?: string;
  /** Upper bound (inclusive) for `created_at`, ISO string. */
  dateTo?: string;
}

export function useServiceOrders(options: UseServiceOrdersOptions = {}) {
  const {
    page = 1, pageSize = 20, search = "", status = "all", sortAsc = false,
    productQuery = "", dateFrom, dateTo,
  } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["service-orders", user?.id, page, pageSize, search, status, sortAsc, productQuery, dateFrom, dateTo],
    queryFn: async () => {
      if (!user) return { orders: [] as StoredServiceOrder[], total: 0 };

      let query = supabase
        .from("service_orders")
        .select("*", { count: "exact" });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(
          `os_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%,product_name.ilike.%${search}%`
        );
      }

      if (productQuery && productQuery.trim()) {
        const term = productQuery.trim().replace(/[%(),]/g, "");
        query = query.or(
          `product_name.ilike.%${term}%,product_sku.ilike.%${term}%`,
        );
      }

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      query = query.order("created_at", { ascending: sortAsc });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rows, error, count } = await query;
      if (error) throw error;
      return {
        orders: (rows ?? []).map(rowToOrder),
        total: count ?? 0,
      };
    },
    enabled: !!user,
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["service-orders"] });

  const addMutation = useMutation({
    mutationFn: async (order: Omit<StoredServiceOrder, "id" | "status" | "createdAt" | "updatedAt" | "lockVersion" | "deletedAt">) => {
      const { data, error } = await supabase
        .from("service_orders")
        .insert({
          user_id: user!.id,
          os_number: order.osNumber,
          date: order.date || new Date().toISOString().split("T")[0],
          delivery_date: order.deliveryDate || null,
          client_name: order.clientName,
          client_company: order.clientCompany || null,
          client_phone: order.clientPhone || null,
          client_email: order.clientEmail || null,
          product_name: order.productName,
          product_sku: order.productSku || null,
          product_material: order.productMaterial || null,
          product_colors: order.productColors || null,
          technique: order.technique,
          area_name: order.areaName || null,
          area_width: order.areaWidth || null,
          area_height: order.areaHeight || null,
          area_shape: order.areaShape || null,
          art_colors: order.artColors || null,
          art_dpi: order.artDpi || null,
          art_file: order.artFile || null,
          art_file_data_url: order.artFileDataUrl || null,
          quantity: parseInt(order.quantity) || 1,
          observations: order.observations || null,
          mockup_image_url: order.mockupImageUrl || null,
          identificacao_caixa: order.identificacaoCaixa || null,
          material_evento: order.materialEvento,
          aprovar_primeira_peca: order.aprovarPrimeiraPeca,
          qtd_compra: order.qtdCompra || null,
          qtd_liberada: order.qtdLiberada || null,
          faz_parte_kit: order.fazParteKit,
          gravacao_detalhe: order.gravacaoDetalhe || null,
          art_asset_id: order.artAssetId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToOrder(data);
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StoredServiceOrder> }) => {
      const dbUpdates: Record<string, string | number | boolean | null> = {};
      
      // Concurrency check
      const currentOrder = orders.find(o => o.id === id);
      if (currentOrder?.lockVersion !== undefined) {
        dbUpdates.lock_version = currentOrder.lockVersion;
      }

      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
      if (updates.clientCompany !== undefined) dbUpdates.client_company = updates.clientCompany || null;
      if (updates.clientPhone !== undefined) dbUpdates.client_phone = updates.clientPhone || null;
      if (updates.clientEmail !== undefined) dbUpdates.client_email = updates.clientEmail || null;
      if (updates.productName !== undefined) dbUpdates.product_name = updates.productName;
      if (updates.productSku !== undefined) dbUpdates.product_sku = updates.productSku || null;
      if (updates.productMaterial !== undefined) dbUpdates.product_material = updates.productMaterial || null;
      if (updates.productColors !== undefined) dbUpdates.product_colors = updates.productColors || null;
      if (updates.technique !== undefined) dbUpdates.technique = updates.technique;
      if (updates.areaName !== undefined) dbUpdates.area_name = updates.areaName || null;
      if (updates.areaWidth !== undefined) dbUpdates.area_width = updates.areaWidth || null;
      if (updates.areaHeight !== undefined) dbUpdates.area_height = updates.areaHeight || null;
      if (updates.areaShape !== undefined) dbUpdates.area_shape = updates.areaShape || null;
      if (updates.artColors !== undefined) dbUpdates.art_colors = updates.artColors || null;
      if (updates.artDpi !== undefined) dbUpdates.art_dpi = updates.artDpi || null;
      if (updates.artFile !== undefined) dbUpdates.art_file = updates.artFile || null;
      if (updates.artFileDataUrl !== undefined) dbUpdates.art_file_data_url = updates.artFileDataUrl || null;
      if (updates.observations !== undefined) dbUpdates.observations = updates.observations || null;
      if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate || null;
      if (updates.quantity !== undefined) dbUpdates.quantity = parseInt(updates.quantity) || 1;
      if (updates.mockupImageUrl !== undefined) dbUpdates.mockup_image_url = updates.mockupImageUrl || null;
      if (updates.identificacaoCaixa !== undefined) dbUpdates.identificacao_caixa = updates.identificacaoCaixa || null;
      if (updates.materialEvento !== undefined) dbUpdates.material_evento = updates.materialEvento;
      if (updates.aprovarPrimeiraPeca !== undefined) dbUpdates.aprovar_primeira_peca = updates.aprovarPrimeiraPeca;
      if (updates.qtdCompra !== undefined) dbUpdates.qtd_compra = updates.qtdCompra || null;
      if (updates.qtdLiberada !== undefined) dbUpdates.qtd_liberada = updates.qtdLiberada || null;
      if (updates.fazParteKit !== undefined) dbUpdates.faz_parte_kit = updates.fazParteKit;
      if (updates.gravacaoDetalhe !== undefined) dbUpdates.gravacao_detalhe = updates.gravacaoDetalhe || null;
      if (updates.artAssetId !== undefined) dbUpdates.art_asset_id = updates.artAssetId ?? null;

      if (Object.keys(dbUpdates).length === 0) return;
      
      const { error, data } = await supabase
        .from("service_orders")
        .update(dbUpdates)
        .eq("id", id)
        .eq("lock_version", dbUpdates.lock_version || 0) // Explicit lock check
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Conflito de concorrência: A ordem de serviço foi alterada por outro usuário. Por favor, recarregue a página.");
      }
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addOrder = useCallback(
    async (order: Omit<StoredServiceOrder, "id" | "status" | "createdAt" | "updatedAt">) => {
      const result = await addMutation.mutateAsync(order);
      return result;
    },
    [addMutation]
  );

  const updateOrder = useCallback(
    async (id: string, updates: Partial<StoredServiceOrder>) => {
      await updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const updateStatus = useCallback(
    (id: string, newStatus: OsStatus) => {
      const order = orders.find((o) => o.id === id);
      if (order && !canTransition(order.status, newStatus)) {
        throw new Error(
          `Transição inválida: ${STATUS_CONFIG[order.status].label} → ${STATUS_CONFIG[newStatus].label}`
        );
      }
      updateOrder(id, { status: newStatus });
    },
    [updateOrder, orders]
  );

  const deleteOrder = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const getOrder = useCallback(
    (id: string) => orders.find((o) => o.id === id) || null,
    [orders]
  );

  return { orders, total, totalPages, isLoading, addOrder, updateOrder, updateStatus, deleteOrder, getOrder };
}

// ─── Status State Machine ──────────────────────────────────
export const STATUS_CONFIG: Record<OsStatus, { label: string; color: string; bg: string }> = {
  aberta: { label: "Aberta", color: "text-[hsl(var(--status-aberta))]", bg: "bg-[hsl(var(--status-aberta-bg)/0.15)]" },
  em_producao: { label: "Em Produção", color: "text-[hsl(var(--status-producao))]", bg: "bg-[hsl(var(--status-producao-bg)/0.15)]" },
  concluida: { label: "Concluída", color: "text-[hsl(var(--status-concluida))]", bg: "bg-[hsl(var(--status-concluida-bg)/0.15)]" },
  cancelada: { label: "Cancelada", color: "text-[hsl(var(--status-cancelada))]", bg: "bg-[hsl(var(--status-cancelada-bg)/0.15)]" },
};

