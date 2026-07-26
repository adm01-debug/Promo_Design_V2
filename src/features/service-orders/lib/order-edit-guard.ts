/**
 * Guarda de edição de Ordem de Serviço (Bloco B).
 *
 * Regra de negócio: OSs em estado terminal (`concluida`) são imutáveis;
 * OSs `cancelada` só aceitam a transição de reabertura (`status` → `aberta`).
 * Qualquer outra tentativa de mutação é rejeitada com o código `ERR_ORDER_EDIT`.
 *
 * A validação é aplicada em duas camadas (defesa em profundidade):
 *  1. Cliente — este módulo, para feedback imediato e telemetria;
 *  2. Banco — trigger `tg_service_orders_edit_guard`, fonte da verdade.
 */
import type { OsStatus, StoredServiceOrder } from "../hooks/use-service-orders";

export const ERR_ORDER_EDIT = "ERR_ORDER_EDIT" as const;

/** Estados que bloqueiam a edição de campos de conteúdo. */
export const LOCKED_EDIT_STATUSES: readonly OsStatus[] = ["concluida", "cancelada"];

export interface OrderEditViolation {
  code: typeof ERR_ORDER_EDIT;
  status: OsStatus;
  /** Campos que a tentativa de edição pretendia alterar. */
  fields: string[];
}

/** Erro tipado lançado pela guarda — permite `catch` discriminado na UI. */
export class OrderEditError extends Error {
  public readonly code = ERR_ORDER_EDIT;
  public readonly status: OsStatus;
  public readonly fields: string[];

  constructor(violation: OrderEditViolation) {
    super(
      violation.status === "concluida"
        ? "OS concluída é imutável: não é possível editar seus dados."
        : "OS cancelada só pode ser reaberta — edição de dados bloqueada.",
    );
    this.name = "OrderEditError";
    this.status = violation.status;
    this.fields = violation.fields;
  }
}

export function isOrderEditError(e: unknown): e is OrderEditError {
  return e instanceof OrderEditError || (typeof e === "object" && e !== null && (e as { code?: string }).code === ERR_ORDER_EDIT);
}

/** `true` quando a OS aceita edição livre de campos de conteúdo. */
export function isOrderEditable(status: OsStatus): boolean {
  return !LOCKED_EDIT_STATUSES.includes(status);
}

/**
 * Retorna a violação encontrada, ou `null` quando a edição é permitida.
 * Alterações que contenham apenas `status` são delegadas à máquina de estados.
 */
export function checkOrderEdit(
  status: OsStatus,
  updates: Partial<StoredServiceOrder>,
): OrderEditViolation | null {
  const fields = Object.keys(updates).filter(
    (k) => k !== "status" && (updates as Record<string, unknown>)[k] !== undefined,
  );
  if (fields.length === 0) return null;
  if (isOrderEditable(status)) return null;
  return { code: ERR_ORDER_EDIT, status, fields };
}

/** Lança `OrderEditError` quando a edição é proibida. */
export function assertOrderEditable(
  status: OsStatus,
  updates: Partial<StoredServiceOrder>,
): void {
  const violation = checkOrderEdit(status, updates);
  if (violation) throw new OrderEditError(violation);
}
