import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useServiceOrders, STATUS_CONFIG, type OsStatus } from "@/hooks/use-service-orders";
import { Select as StatusSelect, SelectContent as StatusSelectContent, SelectItem as StatusSelectItem, SelectTrigger as StatusSelectTrigger, SelectValue as StatusSelectValue } from "@/components/ui/select";
import {
  FileText, Download, Printer, ChevronLeft, Package, Palette,
  Ruler, Hash, User, Building2, Phone, Mail, Calendar, MessageSquare,
  Image as ImageIcon, Copy, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ──────────── Types ────────────
interface ServiceOrderData {
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
  quantity: string;
  deliveryDate: string;
  observations: string;
  mockupImageUrl: string;
}

const TECHNIQUES = [
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

const generateOsNumber = () => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `OS-${y}${m}-${seq}`;
};

const ServiceOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<ServiceOrderData>(() => ({
    osNumber: generateOsNumber(),
    date: new Date().toISOString().slice(0, 10),
    clientName: "",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: searchParams.get("product") || "",
    productSku: searchParams.get("sku") || "",
    productMaterial: searchParams.get("material") || "",
    productColors: searchParams.get("productColors") || "",
    technique: searchParams.get("technique") || "",
    areaName: searchParams.get("area") || "",
    areaWidth: searchParams.get("aw") || "",
    areaHeight: searchParams.get("ah") || "",
    areaShape: searchParams.get("shape") || "",
    artColors: searchParams.get("artColors") || "",
    artDpi: "300",
    artFile: searchParams.get("artFile") || "",
    quantity: "",
    deliveryDate: "",
    observations: "",
    mockupImageUrl: searchParams.get("mockup") || "",
  }));

  const update = (field: keyof ServiceOrderData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ──────────── PDF Generation ────────────
  const generatePdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 15;

    // Header bar
    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, pw, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ORDEM DE SERVIÇO", m, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(form.osNumber, m, 28);
    doc.setFontSize(9);
    doc.text(`Data: ${form.date}`, pw - m, 15, { align: "right" });
    if (form.deliveryDate) {
      doc.text(`Entrega: ${form.deliveryDate}`, pw - m, 22, { align: "right" });
    }

    let y = 48;

    // Client section
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", m, y);
    y += 2;
    (doc as any).autoTable({
      startY: y,
      margin: { left: m, right: m },
      head: [["Cliente", "Empresa", "Telefone", "E-mail"]],
      body: [[form.clientName || "–", form.clientCompany || "–", form.clientPhone || "–", form.clientEmail || "–"]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Product section
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PRODUTO", m, y);
    y += 2;
    (doc as any).autoTable({
      startY: y,
      margin: { left: m, right: m },
      head: [["Produto", "SKU", "Material", "Cores do Produto"]],
      body: [[form.productName || "–", form.productSku || "–", form.productMaterial || "–", form.productColors || "–"]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Printing specs
    doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICAÇÕES DE GRAVAÇÃO", m, y);
    y += 2;
    (doc as any).autoTable({
      startY: y,
      margin: { left: m, right: m },
      head: [["Técnica", "Área", "Largura", "Altura", "Formato", "Cores da Arte", "DPI"]],
      body: [[
        form.technique || "–",
        form.areaName || "–",
        form.areaWidth ? `${form.areaWidth}cm` : "–",
        form.areaHeight ? `${form.areaHeight}cm` : "–",
        form.areaShape || "–",
        form.artColors || "–",
        form.artDpi || "–",
      ]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Quantity & delivery
    doc.setFont("helvetica", "bold");
    doc.text("PRODUÇÃO", m, y);
    y += 2;
    (doc as any).autoTable({
      startY: y,
      margin: { left: m, right: m },
      head: [["Quantidade", "Data de Entrega", "Arquivo da Arte"]],
      body: [[form.quantity || "–", form.deliveryDate || "–", form.artFile || "–"]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Mockup image
    if (form.mockupImageUrl) {
      try {
        const maxW = pw - m * 2;
        const maxH = 70;
        doc.setFont("helvetica", "bold");
        doc.text("MOCKUP APROVADO", m, y);
        y += 4;
        doc.addImage(form.mockupImageUrl, "PNG", m, y, maxW, maxH);
        y += maxH + 6;
      } catch {
        // skip image if invalid
      }
    }

    // Observations
    if (form.observations) {
      if (y > ph - 50) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES", m, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(form.observations, pw - m * 2);
      doc.text(lines, m, y);
      y += lines.length * 4 + 6;
    }

    // Signature lines
    if (y > ph - 40) { doc.addPage(); y = 20; }
    y = Math.max(y + 10, ph - 40);
    doc.setDrawColor(180);
    doc.line(m, y, m + 65, y);
    doc.line(pw - m - 65, y, pw - m, y);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Responsável Produção", m + 32, y + 5, { align: "center" });
    doc.text("Aprovação Cliente", pw - m - 32, y + 5, { align: "center" });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${form.osNumber} • Gerado por Promo Design Studio • ${new Date().toLocaleString("pt-BR")}`,
      pw / 2, ph - 6, { align: "center" }
    );

    return doc;
  };

  const handleDownloadPdf = () => {
    if (!form.productName) {
      toast.error("Informe ao menos o nome do produto");
      return;
    }
    const doc = generatePdf();
    doc.save(`${form.osNumber}.pdf`);
    toast.success("PDF da Ordem de Serviço gerado!");
  };

  const handlePrint = () => {
    if (!form.productName) {
      toast.error("Informe ao menos o nome do produto");
      return;
    }
    const doc = generatePdf();
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    if (w) w.onload = () => { w.print(); };
  };

  const handleCopyOs = () => {
    navigator.clipboard.writeText(form.osNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Número da OS copiado!");
  };

  // ──────────── Field groups ────────────
  const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-base font-display font-bold text-foreground">Ordem de Serviço</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{form.osNumber}</span>
              <button onClick={handleCopyOs} className="hover:text-primary transition-colors">
                {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button size="sm" className="gap-2 text-xs" onClick={handleDownloadPdf}>
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* OS Info */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={FileText} title="Informações da OS" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nº da OS</Label>
                <Input value={form.osNumber} readOnly className="font-mono bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
                <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Entrega</Label>
                <Input type="date" value={form.deliveryDate} onChange={(e) => update("deliveryDate", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Client */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={User} title="Dados do Cliente" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Contato</Label>
                <Input placeholder="João Silva" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Empresa</Label>
                <Input placeholder="Empresa LTDA" value={form.clientCompany} onChange={(e) => update("clientCompany", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input placeholder="(11) 99999-9999" value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input type="email" placeholder="contato@empresa.com" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Product */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Package} title="Dados do Produto" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Produto</Label>
                <Input value={form.productName} onChange={(e) => update("productName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <Input value={form.productSku} onChange={(e) => update("productSku", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Material</Label>
                <Input placeholder="Plástico, Metal, Tecido..." value={form.productMaterial} onChange={(e) => update("productMaterial", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cores do Produto</Label>
                <Input placeholder="Preto, Branco, Azul..." value={form.productColors} onChange={(e) => update("productColors", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Print specs */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Palette} title="Especificações de Gravação" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Técnica de Gravação</Label>
                <Select value={form.technique} onValueChange={(v) => update("technique", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNIQUES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Área de Gravação</Label>
                <Input placeholder="Lado A, Frente, Tampa..." value={form.areaName} onChange={(e) => update("areaName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Largura Máx. (cm)</Label>
                <Input type="number" step="0.1" value={form.areaWidth} onChange={(e) => update("areaWidth", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Altura Máx. (cm)</Label>
                <Input type="number" step="0.1" value={form.areaHeight} onChange={(e) => update("areaHeight", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Formato da Área</Label>
                <Input placeholder="Retangular, Circular..." value={form.areaShape} onChange={(e) => update("areaShape", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cores da Arte (Pantone)</Label>
                <Input placeholder="Pantone 186C, Pantone 300C..." value={form.artColors} onChange={(e) => update("artColors", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Resolução (DPI)</Label>
                <Input type="number" value={form.artDpi} onChange={(e) => update("artDpi", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Arquivo da Arte</Label>
                <Input placeholder="logo-cliente.ai / .pdf / .svg" value={form.artFile} onChange={(e) => update("artFile", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Production */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Hash} title="Produção" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Quantidade (peças)</Label>
                <Input type="number" min="1" placeholder="500" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className="font-mono" />
              </div>
            </div>
          </section>

          {/* Mockup preview */}
          {form.mockupImageUrl && (
            <section className="bg-card rounded-xl border border-border p-6">
              <SectionTitle icon={ImageIcon} title="Mockup Aprovado" />
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                <img src={form.mockupImageUrl} alt="Mockup aprovado" className="w-full max-h-80 object-contain" />
              </div>
            </section>
          )}

          {/* Observations */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={MessageSquare} title="Observações Técnicas" />
            <Textarea
              placeholder="Informações adicionais sobre acabamento, embalagem, tratamento de cores, cuidados especiais..."
              rows={4}
              value={form.observations}
              onChange={(e) => update("observations", e.target.value)}
            />
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pb-10">
            <Button size="lg" className="flex-1 gap-2" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" /> Baixar PDF da OS
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir OS
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ServiceOrder;
