import { z } from "zod";

// ─── Zod Schema ────────────────────────────────────────────
export const serviceOrderSchema = z.object({
  osNumber: z.string().min(1),
  date: z.string().min(1),
  deliveryDate: z.string(),
  clientName: z.string().trim().min(1, "Nome do cliente é obrigatório"),
  clientCompany: z.string(),
  clientPhone: z.string(),
  clientEmail: z.string(),
  productName: z.string().trim().min(1, "Nome do produto é obrigatório"),
  productSku: z.string(),
  productMaterial: z.string(),
  productColors: z.string(),
  technique: z.string().min(1, "Selecione a técnica de gravação"),
  areaName: z.string(),
  areaWidth: z.string(),
  areaHeight: z.string(),
  areaShape: z.string(),
  artColors: z.string(),
  artDpi: z.string(),
  artFile: z.string(),
  artFileDataUrl: z.string(),
  quantity: z
    .string()
    .trim()
    .min(1, "Informe a quantidade (mín. 1)")
    .refine((v) => {
      const n = Number(v);
      return !isNaN(n) && n >= 1;
    }, "Informe a quantidade (mín. 1)"),
  observations: z.string(),
  mockupImageUrl: z.string(),
  identificacaoCaixa: z.string(),
  materialEvento: z.boolean(),
  aprovarPrimeiraPeca: z.boolean(),
  qtdCompra: z.string(),
  qtdLiberada: z.string(),
  fazParteKit: z.boolean(),
  gravacaoDetalhe: z.string(),
  artAssetId: z.string().uuid("artAssetId deve ser um UUID válido").nullable().optional(),
});

// ─── Types (derived from Zod) ──────────────────────────────
export type ServiceOrderData = z.infer<typeof serviceOrderSchema>;

export interface ValidationErrors {
  [key: string]: string | undefined;
  productName?: string;
  clientName?: string;
  technique?: string;
  quantity?: string;
}

export function validateForm(form: ServiceOrderData): ValidationErrors {
  const result = serviceOrderSchema.safeParse(form);
  if (result.success) return {};

  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) {
      // Improve readability of Zod errors for the user
      let message = issue.message;
      if (issue.code === "invalid_type" && issue.expected === "string") {
        message = "Este campo é obrigatório";
      }
      errors[field] = message;
    }
  }
  return errors;
}

// ─── Constants ─────────────────────────────────────────────
export const TECHNIQUES = [
  "Laser Fiber",
  "Laser UV",
  "Laser Co2",
  "Serigrafia Têxtil",
  "Serigrafia Vinílica Plana",
  "Serigrafia Vinílica Rotativa",
  "Tampografia",
  "(DTF) Transfer Digital Têxtil",
  "(DTF) Transfer Digital UV",
  "Sublimação - Caneca",
  "Sublimação Têxtil",
  "Hot Stamping (Baixo Relevo)",
  "Digital UV",
  "Adesivo Resinado",
  "Bordado",
  "Decalque",
  "Filme de Recorte",
] as const;

export const generateOsNumber = () => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `OS-${y}${m}-${seq}`;
};
