import { useState, useCallback, useEffect } from "react";

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
  quantity: string;
  observations: string;
  mockupImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "promo-design-service-orders";

function loadOrders(): StoredServiceOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: StoredServiceOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function useServiceOrders() {
  const [orders, setOrders] = useState<StoredServiceOrder[]>(loadOrders);

  // Sync state to localStorage
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  const addOrder = useCallback((order: Omit<StoredServiceOrder, "id" | "status" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newOrder: StoredServiceOrder = {
      ...order,
      id: crypto.randomUUID(),
      status: "aberta",
      createdAt: now,
      updatedAt: now,
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<StoredServiceOrder>) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
      )
    );
  }, []);

  const updateStatus = useCallback((id: string, status: OsStatus) => {
    updateOrder(id, { status });
  }, [updateOrder]);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const getOrder = useCallback((id: string) => {
    return orders.find((o) => o.id === id) || null;
  }, [orders]);

  return { orders, addOrder, updateOrder, updateStatus, deleteOrder, getOrder };
}

export const STATUS_CONFIG: Record<OsStatus, { label: string; color: string; bg: string }> = {
  aberta: { label: "Aberta", color: "text-blue-400", bg: "bg-blue-500/15" },
  em_producao: { label: "Em Produção", color: "text-amber-400", bg: "bg-amber-500/15" },
  concluida: { label: "Concluída", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  cancelada: { label: "Cancelada", color: "text-red-400", bg: "bg-red-500/15" },
};
