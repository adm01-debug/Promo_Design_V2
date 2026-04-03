import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export type OsStatus = "aberta" | "em_producao" | "concluida" | "cancelada";

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
  createdAt: string;
  updatedAt: string;
}

function rowToOrder(row: Tables<"service_orders">): StoredServiceOrder {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useServiceOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["service-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToOrder);
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["service-orders"] });

  const addMutation = useMutation({
    mutationFn: async (order: Omit<StoredServiceOrder, "id" | "status" | "createdAt" | "updatedAt">) => {
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
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
      if (updates.clientCompany !== undefined) dbUpdates.client_company = updates.clientCompany;
      if (updates.clientPhone !== undefined) dbUpdates.client_phone = updates.clientPhone;
      if (updates.clientEmail !== undefined) dbUpdates.client_email = updates.clientEmail;
      if (updates.productName !== undefined) dbUpdates.product_name = updates.productName;
      if (updates.productSku !== undefined) dbUpdates.product_sku = updates.productSku;
      if (updates.productMaterial !== undefined) dbUpdates.product_material = updates.productMaterial;
      if (updates.productColors !== undefined) dbUpdates.product_colors = updates.productColors;
      if (updates.technique !== undefined) dbUpdates.technique = updates.technique;
      if (updates.areaName !== undefined) dbUpdates.area_name = updates.areaName;
      if (updates.areaWidth !== undefined) dbUpdates.area_width = updates.areaWidth;
      if (updates.areaHeight !== undefined) dbUpdates.area_height = updates.areaHeight;
      if (updates.areaShape !== undefined) dbUpdates.area_shape = updates.areaShape;
      if (updates.artColors !== undefined) dbUpdates.art_colors = updates.artColors;
      if (updates.artDpi !== undefined) dbUpdates.art_dpi = updates.artDpi;
      if (updates.artFile !== undefined) dbUpdates.art_file = updates.artFile;
      if (updates.artFileDataUrl !== undefined) dbUpdates.art_file_data_url = updates.artFileDataUrl;
      if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
      if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;
      if (updates.quantity !== undefined) dbUpdates.quantity = parseInt(updates.quantity) || 1;
      if (updates.mockupImageUrl !== undefined) dbUpdates.mockup_image_url = updates.mockupImageUrl;
      if (updates.identificacaoCaixa !== undefined) dbUpdates.identificacao_caixa = updates.identificacaoCaixa;
      if (updates.materialEvento !== undefined) dbUpdates.material_evento = updates.materialEvento;
      if (updates.aprovarPrimeiraPeca !== undefined) dbUpdates.aprovar_primeira_peca = updates.aprovarPrimeiraPeca;
      if (updates.qtdCompra !== undefined) dbUpdates.qtd_compra = updates.qtdCompra;
      if (updates.qtdLiberada !== undefined) dbUpdates.qtd_liberada = updates.qtdLiberada;
      if (updates.fazParteKit !== undefined) dbUpdates.faz_parte_kit = updates.fazParteKit;
      if (updates.gravacaoDetalhe !== undefined) dbUpdates.gravacao_detalhe = updates.gravacaoDetalhe;

      if (Object.keys(dbUpdates).length === 0) return;
      const { error } = await supabase.from("service_orders").update(dbUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
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
    (id: string, updates: Partial<StoredServiceOrder>) => {
      updateMutation.mutate({ id, updates });
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

  return { orders, isLoading, addOrder, updateOrder, updateStatus, deleteOrder, getOrder };
}

// ─── Status State Machine ──────────────────────────────────
export const STATUS_CONFIG: Record<OsStatus, { label: string; color: string; bg: string }> = {
  aberta: { label: "Aberta", color: "text-blue-400", bg: "bg-blue-500/15" },
  em_producao: { label: "Em Produção", color: "text-amber-400", bg: "bg-amber-500/15" },
  concluida: { label: "Concluída", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  cancelada: { label: "Cancelada", color: "text-red-400", bg: "bg-red-500/15" },
};

/** Allowed status transitions (state machine) */
export const STATUS_TRANSITIONS: Record<OsStatus, OsStatus[]> = {
  aberta: ["em_producao", "cancelada"],
  em_producao: ["concluida", "cancelada"],
  concluida: [], // terminal state
  cancelada: ["aberta"], // can reopen
};

/** Check if a status transition is valid */
export function canTransition(from: OsStatus, to: OsStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Get allowed next statuses from a given status */
export function getNextStatuses(current: OsStatus): OsStatus[] {
  return STATUS_TRANSITIONS[current];
}
