export interface ServiceOrderData {
  osNumber: string;
  date: string;
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
  deliveryDate: string;
  observations: string;
  mockupImageUrl: string;
}

export const TECHNIQUES = [
  "Serigrafia",
  "Tampografia",
  "Gravação a Laser",
  "Impressão UV",
  "Sublimação",
  "Transfer",
  "Bordado",
  "Hot Stamping",
  "Impressão Digital",
];

export const generateOsNumber = () => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `OS-${y}${m}-${seq}`;
};

export interface ValidationErrors {
  [key: string]: string | undefined;
  productName?: string;
  clientName?: string;
  technique?: string;
  quantity?: string;
}

export function validateForm(form: ServiceOrderData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!form.productName.trim()) errors.productName = "Nome do produto é obrigatório";
  if (!form.clientName.trim()) errors.clientName = "Nome do cliente é obrigatório";
  if (!form.technique) errors.technique = "Selecione a técnica de gravação";
  if (!form.quantity.trim() || Number(form.quantity) < 1) errors.quantity = "Informe a quantidade (mín. 1)";
  return errors;
}
