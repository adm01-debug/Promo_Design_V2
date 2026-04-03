import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFileUpload } from "@/hooks/use-file-upload";
import { motion } from "framer-motion";
import { useServiceOrders, STATUS_CONFIG, type OsStatus } from "@/features/service-orders";
import { ProductPicker } from "@/features/catalog";
import { Select as StatusSelect, SelectContent as StatusSelectContent, SelectItem as StatusSelectItem, SelectTrigger as StatusSelectTrigger, SelectValue as StatusSelectValue } from "@/components/ui/select";
import {
  FileText, Download, Printer, ChevronLeft, Package, Palette,
  Hash, User, MessageSquare, Image as ImageIcon, Copy, CheckCircle2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  SectionTitle, ArtUploadField, PdfPreviewDialog,
  generateServiceOrderPdf, getLogoDataUrl,
  ServiceOrderData, TECHNIQUES, generateOsNumber, validateForm,
} from "@/features/service-orders";

const ServiceOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { addOrder, getOrder, updateOrder } = useServiceOrders();
  const { uploadFile } = useFileUpload();
  const [uploading, setUploading] = useState(false);
  const editId = searchParams.get("edit");
  const existingOrder = editId ? getOrder(editId) : null;
  const [saved, setSaved] = useState(!!existingOrder);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const logoRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    getLogoDataUrl().then((url) => { logoRef.current = url; }).catch(() => {});
  }, []);

  const [form, setForm] = useState<ServiceOrderData>(() => {
    if (existingOrder) {
      return {
        osNumber: existingOrder.osNumber,
        date: existingOrder.date,
        clientName: existingOrder.clientName,
        clientCompany: existingOrder.clientCompany,
        clientPhone: existingOrder.clientPhone,
        clientEmail: existingOrder.clientEmail,
        productName: existingOrder.productName,
        productSku: existingOrder.productSku,
        productMaterial: existingOrder.productMaterial,
        productColors: existingOrder.productColors,
        technique: existingOrder.technique,
        areaName: existingOrder.areaName,
        areaWidth: existingOrder.areaWidth,
        areaHeight: existingOrder.areaHeight,
        areaShape: existingOrder.areaShape,
        artColors: existingOrder.artColors,
        artDpi: existingOrder.artDpi,
        artFile: existingOrder.artFile,
        artFileDataUrl: existingOrder.artFileDataUrl || "",
        quantity: existingOrder.quantity,
        deliveryDate: existingOrder.deliveryDate,
        observations: existingOrder.observations,
        mockupImageUrl: existingOrder.mockupImageUrl,
        identificacaoCaixa: existingOrder.identificacaoCaixa || "",
        materialEvento: existingOrder.materialEvento || false,
        aprovarPrimeiraPeca: existingOrder.aprovarPrimeiraPeca || false,
        qtdCompra: existingOrder.qtdCompra || "",
        qtdLiberada: existingOrder.qtdLiberada || "",
        fazParteKit: existingOrder.fazParteKit || false,
        gravacaoDetalhe: existingOrder.gravacaoDetalhe || "",
      };
    }
    return {
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
      artFileDataUrl: "",
      quantity: "",
      deliveryDate: "",
      observations: "",
      mockupImageUrl: searchParams.get("mockup") || "",
      identificacaoCaixa: "",
      materialEvento: false,
      aprovarPrimeiraPeca: false,
      qtdCompra: "",
      qtdLiberada: "",
      fazParteKit: false,
      gravacaoDetalhe: "",
    };
  });

  const [currentStatus, setCurrentStatus] = useState<OsStatus>(existingOrder?.status || "aberta");

  const update = (field: keyof ServiceOrderData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSaved(false);
  };

  const handleArtUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Upload to cloud storage
      const publicUrl = await uploadFile(file, "art-files");

      if (publicUrl) {
        // For images, use the cloud URL as preview; for non-images, no preview
        const isImage = file.type.startsWith("image/");
        setForm((prev) => ({
          ...prev,
          artFile: file.name,
          artFileDataUrl: isImage ? publicUrl : "",
        }));
        setSaved(false);
        toast.success("Arte enviada para a nuvem!");
      } else {
        // Fallback: read locally if upload fails (e.g. not logged in)
        if (!file.type.startsWith("image/")) {
          setForm((prev) => ({ ...prev, artFile: file.name, artFileDataUrl: "" }));
          setSaved(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === "string") {
            setForm((prev) => ({ ...prev, artFile: file.name, artFileDataUrl: dataUrl }));
            setSaved(false);
          }
        };
        reader.readAsDataURL(file);
        toast.warning("Upload na nuvem falhou. Arte salva localmente.");
      }
    } catch {
      toast.error("Erro ao enviar a arte.");
    } finally {
      setUploading(false);
    }
  }, [uploadFile]);

  const removeArt = () => {
    setForm((prev) => ({ ...prev, artFile: "", artFileDataUrl: "" }));
    setSaved(false);
  };

  const handleSave = () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }
    if (editId && existingOrder) {
      updateOrder(editId, { ...form, status: currentStatus });
      toast.success("Ordem de Serviço atualizada!");
    } else {
      addOrder(form).then((newOrder) => {
        navigate(`/mockup/service-order?edit=${newOrder.id}`, { replace: true });
      });
      toast.success("Ordem de Serviço salva!");
    }
    setSaved(true);
  };

  const getValidatedPdfBlob = (actionLabel: "visualizar" | "gerar") => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error(`Preencha os campos obrigatórios antes de ${actionLabel} o PDF`);
      return null;
    }

    const doc = generateServiceOrderPdf(form, logoRef.current);
    return doc.output("blob");
  };

  const handlePreviewPdf = () => {
    const blob = getValidatedPdfBlob("visualizar");
    if (!blob) return;
    setPreviewBlob(blob);
    setPreviewOpen(true);
  };

  const handleDownloadPdf = () => {
    const blob = getValidatedPdfBlob("gerar");
    if (!blob) return;
    setPreviewBlob(blob);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Preencha os campos obrigatórios antes de imprimir");
      return;
    }
    const doc = generateServiceOrderPdf(form, logoRef.current);
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

  const fieldError = (field: string) =>
    errors[field] ? <p className="text-[11px] text-destructive mt-1">{errors[field]}</p> : null;

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
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editId && (
            <StatusSelect value={currentStatus} onValueChange={(v) => { setCurrentStatus(v as OsStatus); setSaved(false); }}>
              <StatusSelectTrigger className="w-[140px] h-9 text-xs">
                <StatusSelectValue />
              </StatusSelectTrigger>
              <StatusSelectContent>
                {(Object.entries(STATUS_CONFIG) as [OsStatus, { label: string }][]).map(([key, cfg]) => (
                  <StatusSelectItem key={key} value={key}>{cfg.label}</StatusSelectItem>
                ))}
              </StatusSelectContent>
            </StatusSelect>
          )}
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleSave} disabled={saved}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {saved ? "Salvo" : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handlePreviewPdf}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button size="sm" className="gap-2 text-xs" onClick={handleDownloadPdf}>
            <Download className="w-3.5 h-3.5" /> Preview + Baixar
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
                <Label className="text-xs text-muted-foreground">Data de Solicitação</Label>
                <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Entrega</Label>
                <Input type="date" value={form.deliveryDate} onChange={(e) => update("deliveryDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Identificação Caixa</Label>
                <Input placeholder="___/___" value={form.identificacaoCaixa} onChange={(e) => update("identificacaoCaixa", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Client */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={User} title="Dados do Cliente" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Contato *</Label>
                <Input
                  placeholder="João Silva"
                  value={form.clientName}
                  onChange={(e) => update("clientName", e.target.value)}
                  className={errors.clientName ? "border-destructive" : ""}
                />
                {fieldError("clientName")}
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
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={Package} title="Dados do Produto" />
              <ProductPicker
                value={{ name: form.productName, sku: form.productSku, material: form.productMaterial, colors: form.productColors }}
                onChange={(p) => {
                  update("productName", p.name);
                  update("productSku", p.sku);
                  update("productMaterial", p.material);
                  update("productColors", p.colors);
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Produto *</Label>
                <Input
                  value={form.productName}
                  onChange={(e) => update("productName", e.target.value)}
                  className={errors.productName ? "border-destructive" : ""}
                />
                {fieldError("productName")}
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
                <Label className="text-xs text-muted-foreground">Cor do Produto</Label>
                <Input placeholder="Branco, Preto, Azul..." value={form.productColors} onChange={(e) => update("productColors", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Print specs */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Palette} title="Especificações de Gravação" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Técnica de Gravação *</Label>
                <Select value={form.technique} onValueChange={(v) => update("technique", v)}>
                  <SelectTrigger className={errors.technique ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNIQUES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("technique")}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Detalhe da Gravação</Label>
                <Input placeholder="Gravação Laser Escuro, Serigrafia 2 cores..." value={form.gravacaoDetalhe} onChange={(e) => update("gravacaoDetalhe", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Área de Gravação</Label>
                <Input placeholder="Lado A, Frente, Tampa..." value={form.areaName} onChange={(e) => update("areaName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Formato da Área</Label>
                <Input placeholder="Retangular, Circular..." value={form.areaShape} onChange={(e) => update("areaShape", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Largura (cm)</Label>
                <Input type="number" step="0.1" value={form.areaWidth} onChange={(e) => update("areaWidth", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
                <Input type="number" step="0.1" value={form.areaHeight} onChange={(e) => update("areaHeight", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cores da Arte (Pantone)</Label>
                <Input placeholder="Pantone 186C, Pantone 300C..." value={form.artColors} onChange={(e) => update("artColors", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Resolução (DPI)</Label>
                <Input type="number" value={form.artDpi} onChange={(e) => update("artDpi", e.target.value)} className="font-mono" />
              </div>
              <ArtUploadField
                artFile={form.artFile}
                artFileDataUrl={form.artFileDataUrl}
                onUpload={handleArtUpload}
                onRemove={removeArt}
                uploading={uploading}
              />
            </div>
          </section>

          {/* Production + Controls */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Hash} title="Produção" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Quantidade (peças) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="500"
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  className={`font-mono ${errors.quantity ? "border-destructive" : ""}`}
                />
                {fieldError("quantity")}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Qtd. Compra</Label>
                <Input type="number" min="1" placeholder="Igual à quantidade" value={form.qtdCompra} onChange={(e) => update("qtdCompra", e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Qtd. Liberada para Personalização</Label>
                <Input type="number" min="1" placeholder="Igual à quantidade" value={form.qtdLiberada} onChange={(e) => update("qtdLiberada", e.target.value)} className="font-mono" />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
                <Label className="text-xs text-muted-foreground">Material de Evento?</Label>
                <Switch checked={form.materialEvento} onCheckedChange={(v) => update("materialEvento", v)} />
              </div>
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
                <Label className="text-xs text-muted-foreground">Aprovar 1ª Peça?</Label>
                <Switch checked={form.aprovarPrimeiraPeca} onCheckedChange={(v) => update("aprovarPrimeiraPeca", v)} />
              </div>
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
                <Label className="text-xs text-muted-foreground">Faz Parte de Kit?</Label>
                <Switch checked={form.fazParteKit} onCheckedChange={(v) => update("fazParteKit", v)} />
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
            <Button size="lg" className="flex-1 gap-2" onClick={handleSave} disabled={saved}>
              <CheckCircle2 className="w-4 h-4" /> {saved ? "OS Salva ✓" : "Salvar Ordem de Serviço"}
            </Button>
            <Button size="lg" variant="secondary" className="flex-1 gap-2" onClick={handlePreviewPdf}>
              <Eye className="w-4 h-4" /> Preview do PDF
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" /> Preview + Baixar
            </Button>
          </div>
        </motion.div>
      </div>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfBlob={previewBlob}
        fileName={`${form.osNumber}.pdf`}
      />
    </div>
  );
};

export default ServiceOrder;
