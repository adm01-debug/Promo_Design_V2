import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

import { useFileUpload } from "@/hooks/use-file-upload";
import { motion } from "framer-motion";
import { useServiceOrders, type OsStatus } from "@/features/service-orders";
import { ProductPicker } from "@/features/catalog";
import {
  FileText, Package, Palette, Hash, User, MessageSquare, Image as ImageIcon, CheckCircle2, Eye, Download,
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
  generateServiceOrderPdf, generateFinalArtPdf, getLogoDataUrl,
  ServiceOrderData, TECHNIQUES, generateOsNumber, validateForm,
} from "@/features/service-orders";
import ServiceOrderTopBar from "@/features/service-orders/components/ServiceOrderTopBar";
import { AssetPicker, downloadAssetAsFile } from "@/features/dam";
import type { Asset } from "@/features/dam";
import AssetVersionUpdateBanner from "@/features/service-orders/components/AssetVersionUpdateBanner";
import { ErrorLogger } from "@/lib/error-logger";

const ServiceOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { addOrder, getOrder, updateOrder } = useServiceOrders();
  const { uploadFile } = useFileUpload();
  const [uploading, setUploading] = useState(false);
  const editId = searchParams.get("edit");
  const existingOrder = editId ? getOrder(editId) : null;
  const [saved, setSaved] = useState(!!existingOrder);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [damPickerOpen, setDamPickerOpen] = useState(false);
  const logoRef = useRef<string | undefined>(undefined);

  useEffect(() => { getLogoDataUrl().then((url) => { logoRef.current = url; }).catch(() => {}); }, []);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (existingOrder && !loadedRef.current) {
      loadedRef.current = true;
      setForm({
        osNumber: existingOrder.osNumber, date: existingOrder.date, clientName: existingOrder.clientName, clientCompany: existingOrder.clientCompany, clientPhone: existingOrder.clientPhone, clientEmail: existingOrder.clientEmail, productName: existingOrder.productName, productSku: existingOrder.productSku, productMaterial: existingOrder.productMaterial, productColors: existingOrder.productColors, technique: existingOrder.technique, areaName: existingOrder.areaName, areaWidth: existingOrder.areaWidth, areaHeight: existingOrder.areaHeight, areaShape: existingOrder.areaShape, artColors: existingOrder.artColors, artDpi: existingOrder.artDpi, artFile: existingOrder.artFile, artFileDataUrl: existingOrder.artFileDataUrl || "", artAssetId: (existingOrder as { artAssetId?: string | null }).artAssetId ?? null, quantity: existingOrder.quantity, deliveryDate: existingOrder.deliveryDate, observations: existingOrder.observations, mockupImageUrl: existingOrder.mockupImageUrl || "", identificacaoCaixa: existingOrder.identificacaoCaixa || "", materialEvento: existingOrder.materialEvento || false, aprovarPrimeiraPeca: existingOrder.aprovarPrimeiraPeca || false, qtdCompra: existingOrder.qtdCompra || "", qtdLiberada: existingOrder.qtdLiberada || "", fazParteKit: existingOrder.fazParteKit || false, gravacaoDetalhe: existingOrder.gravacaoDetalhe || "",
      });
      setCurrentStatus(existingOrder.status);
      setSaved(true);
    }
  }, [existingOrder]);

  useEffect(() => {
    if (location.state?.prefill && !editId) {
      const prefill = location.state.prefill;
      
      // Robust mapping with defaults and type coercion
      const mappedData: Partial<ServiceOrderData> = {
        productName: String(prefill.productName || "").trim(),
        productSku: String(prefill.productSku || "").trim(),
        technique: String(prefill.technique || "").trim(),
        areaWidth: prefill.areaWidth ? String(prefill.areaWidth).replace(",", ".").trim() : "",
        areaHeight: prefill.areaHeight ? String(prefill.areaHeight).replace(",", ".").trim() : "",
        areaName: String(prefill.areaName || "Personalização").trim(),
        artFileDataUrl: String(prefill.artFileDataUrl || ""),
        artFile: prefill.artFileDataUrl ? "mockup-editor-export.png" : String(prefill.artFile || ""),
        observations: prefill.observations ? String(prefill.observations) : "Importado do Editor de Mockups",
        artColors: String(prefill.artColors || "").trim(),
        mockupImageUrl: String(prefill.mockupImageUrl || "").trim(),
      };

      setForm(prev => ({
        ...prev,
        ...mappedData,
        osNumber: prefill.osNumber || prev.osNumber,
      }));

      // Immediate validation after import to highlight missing required fields
      const importErrors = validateForm({ ...form, ...mappedData } as ServiceOrderData);
      setErrors(importErrors);

      toast.success("Dados importados com sucesso", {
        description: ` SKU ${mappedData.productSku} pronto para finalização.`,
      });
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state, editId]);



  const [form, setForm] = useState<ServiceOrderData>(() => {
    if (existingOrder) {
      return { osNumber: existingOrder.osNumber, date: existingOrder.date, clientName: existingOrder.clientName, clientCompany: existingOrder.clientCompany, clientPhone: existingOrder.clientPhone, clientEmail: existingOrder.clientEmail, productName: existingOrder.productName, productSku: existingOrder.productSku, productMaterial: existingOrder.productMaterial, productColors: existingOrder.productColors, technique: existingOrder.technique, areaName: existingOrder.areaName, areaWidth: existingOrder.areaWidth, areaHeight: existingOrder.areaHeight, areaShape: existingOrder.areaShape, artColors: existingOrder.artColors, artDpi: existingOrder.artDpi, artFile: existingOrder.artFile, artFileDataUrl: existingOrder.artFileDataUrl || "", artAssetId: (existingOrder as { artAssetId?: string | null }).artAssetId ?? null, quantity: existingOrder.quantity, deliveryDate: existingOrder.deliveryDate, observations: existingOrder.observations, mockupImageUrl: existingOrder.mockupImageUrl, identificacaoCaixa: existingOrder.identificacaoCaixa || "", materialEvento: existingOrder.materialEvento || false, aprovarPrimeiraPeca: existingOrder.aprovarPrimeiraPeca || false, qtdCompra: existingOrder.qtdCompra || "", qtdLiberada: existingOrder.qtdLiberada || "", fazParteKit: existingOrder.fazParteKit || false, gravacaoDetalhe: existingOrder.gravacaoDetalhe || "" };
    }
    return { osNumber: generateOsNumber(), date: new Date().toISOString().slice(0, 10), clientName: "", clientCompany: "", clientPhone: "", clientEmail: "", productName: searchParams.get("product") || "", productSku: searchParams.get("sku") || "", productMaterial: searchParams.get("material") || "", productColors: searchParams.get("productColors") || "", technique: searchParams.get("technique") || "", areaName: searchParams.get("area") || "", areaWidth: searchParams.get("aw") || "", areaHeight: searchParams.get("ah") || "", areaShape: searchParams.get("shape") || "", artColors: searchParams.get("artColors") || "", artDpi: "300", artFile: searchParams.get("artFile") || "", artFileDataUrl: "", artAssetId: null, quantity: "", deliveryDate: "", observations: "", mockupImageUrl: searchParams.get("mockup") || "", identificacaoCaixa: "", materialEvento: false, aprovarPrimeiraPeca: false, qtdCompra: "", qtdLiberada: "", fazParteKit: false, gravacaoDetalhe: "" };
  });

  const [currentStatus, setCurrentStatus] = useState<OsStatus>(existingOrder?.status || "aberta");

  const maskPhone = (v: string) => {
    const numbers = v.replace(/\D/g, "");
    if (numbers.length <= 10) return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const update = (field: keyof ServiceOrderData, value: string | boolean) => {
    let finalValue = value;
    if (field === "clientPhone" && typeof value === "string") {
      finalValue = maskPhone(value);
    }
    setForm((prev) => ({ ...prev, [field]: finalValue }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSaved(false);
  };

  const handleArtUpload = useCallback(async (file: File, opts?: { keepAssetId?: boolean }) => {
    setUploading(true);
    try {
      const publicUrl = await uploadFile(file, "art-files");
      if (publicUrl) {
        const isImage = file.type.startsWith("image/");
        setForm((prev) => ({ ...prev, artFile: file.name, artFileDataUrl: isImage ? publicUrl : "", ...(opts?.keepAssetId ? {} : { artAssetId: null }) }));
        setSaved(false); toast.success("Arte enviada para a nuvem!");
      } else {
        if (!file.type.startsWith("image/")) { setForm((prev) => ({ ...prev, artFile: file.name, artFileDataUrl: "", ...(opts?.keepAssetId ? {} : { artAssetId: null }) })); setSaved(false); return; }
        const reader = new FileReader();
        reader.onload = (e) => { const dataUrl = e.target?.result; if (typeof dataUrl === "string") { setForm((prev) => ({ ...prev, artFile: file.name, artFileDataUrl: dataUrl, ...(opts?.keepAssetId ? {} : { artAssetId: null }) })); setSaved(false); } };
        reader.readAsDataURL(file); toast.warning("Upload na nuvem falhou. Arte salva localmente.");
      }
    } catch (err) { 
      ErrorLogger.error("Art upload failed", err);
      toast.error("Erro ao enviar a arte."); 
    } finally { setUploading(false); }
  }, [uploadFile]);

  const removeArt = () => { setForm((prev) => ({ ...prev, artFile: "", artFileDataUrl: "", artAssetId: null })); setSaved(false); };

  const handlePickFromDam = useCallback(async (asset: Asset) => {
    try {
      const file = await downloadAssetAsFile(asset.file_path, asset.name, asset.mime_type);
      await handleArtUpload(file, { keepAssetId: true });
      setForm((prev) => ({ ...prev, artAssetId: asset.id }));
      toast.success("Arte vinculada à biblioteca");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar arte do DAM.");
    }
  }, [handleArtUpload]);

  const handleVersionUpdate = useCallback(async (file: File, newAssetId: string) => {
    await handleArtUpload(file, { keepAssetId: true });
    setForm((prev) => ({ ...prev, artAssetId: newAssetId }));
    setSaved(false);
  }, [handleArtUpload]);

  const handleSave = useCallback(async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) { 
      setErrors(validationErrors); 
      toast.error(Object.values(validationErrors)[0]); 
      return; 
    }
    try {
      if (editId) { 
        await updateOrder(editId, { ...form, status: currentStatus }); 
        toast.success("Ordem de Serviço atualizada!"); 
        setSaved(true); 
      }
      else { 
        const { lockVersion: _lv, deletedAt: _da, ...formWithoutMeta } = form as any;
        const newOrder = await addOrder(formWithoutMeta); 
        navigate(`/mockup/service-order?edit=${newOrder.id}`, { replace: true }); 
        toast.success("Ordem de Serviço salva!"); 
        setSaved(true); 
      }
    } catch (err) { 
      ErrorLogger.error("Failed to save service order", err, { editId, osNumber: form.osNumber });
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : "tente novamente")); 
    }
  }, [form, editId, currentStatus, updateOrder, addOrder, navigate]);

  const getValidatedPdfBlob = useCallback((actionLabel: "visualizar" | "gerar") => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) { 
      setErrors(validationErrors); 
      toast.error(`Preencha os campos obrigatórios antes de ${actionLabel} o PDF`); 
      return null; 
    }
    return generateServiceOrderPdf(form, logoRef.current).output("blob");
  }, [form]);

  const handlePreviewPdf = useCallback(() => { 
    const blob = getValidatedPdfBlob("visualizar"); 
    if (!blob) return; 
    setPreviewBlob(blob); 
    setPreviewOpen(true); 
  }, [getValidatedPdfBlob]);

  const handleDownloadPdf = useCallback(() => { 
    const blob = getValidatedPdfBlob("gerar"); 
    if (!blob) return; 
    setPreviewBlob(blob); 
    setPreviewOpen(true); 
  }, [getValidatedPdfBlob]);
  
  const handleDownloadFinalArt = useCallback(() => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) { 
      setErrors(validationErrors); 
      toast.error("Preencha os campos obrigatórios antes de gerar a arte final"); 
      return; 
    }
    const doc = generateFinalArtPdf(form);
    doc.save(`ARTE_FINAL_${form.osNumber}.pdf`);
    toast.success("Arte Final gerada com sucesso!");
  }, [form]);

  const handlePrint = useCallback(() => {
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
    if (w) {
      w.onload = () => { w.print(); };
    }
  }, [form]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saved) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handlePrint, saved]);

  const fieldError = (field: string) => errors[field] ? (
    <motion.p 
      initial={{ x: -4, opacity: 0 }} 
      animate={{ x: 0, opacity: 1 }} 
      className="text-[11px] text-destructive mt-1 font-medium"
    >
      {errors[field]}
    </motion.p>
  ) : null;

  return (
    <div className="min-h-screen bg-background">
      <ServiceOrderTopBar osNumber={form.osNumber} editId={editId} currentStatus={currentStatus} setCurrentStatus={setCurrentStatus} saved={saved} setSaved={setSaved} onSave={handleSave} onPreviewPdf={handlePreviewPdf} onPrint={handlePrint} onDownloadPdf={handleDownloadPdf} onDownloadFinalArt={handleDownloadFinalArt} />

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
          {/* OS Info */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={FileText} title="Informações da OS" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label className="text-xs text-muted-foreground">Nº da OS</Label><Input value={form.osNumber} readOnly className="font-mono bg-muted/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Data de Solicitação</Label><Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Data de Entrega</Label><Input type="date" value={form.deliveryDate} onChange={(e) => update("deliveryDate", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Identificação Caixa</Label><Input placeholder="___/___" value={form.identificacaoCaixa} onChange={(e) => update("identificacaoCaixa", e.target.value)} /></div>
            </div>
          </section>

          {/* Client */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={User} title="Dados do Cliente" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Nome do Contato *</Label><Input placeholder="João Silva" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} className={errors.clientName ? "border-destructive" : ""} />{fieldError("clientName")}</div>
              <div><Label className="text-xs text-muted-foreground">Empresa</Label><Input placeholder="Empresa LTDA" value={form.clientCompany} onChange={(e) => update("clientCompany", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Telefone</Label><Input placeholder="(11) 99999-9999" value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">E-mail</Label><Input type="email" placeholder="contato@empresa.com" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} /></div>
            </div>
          </section>

          {/* Product */}
          <section className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={Package} title="Dados do Produto" />
              <ProductPicker value={{ name: form.productName, sku: form.productSku, material: form.productMaterial, colors: form.productColors }} onChange={(p) => { update("productName", p.name); update("productSku", p.sku); update("productMaterial", p.material); update("productColors", p.colors); }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Nome do Produto *</Label><Input value={form.productName} onChange={(e) => update("productName", e.target.value)} className={errors.productName ? "border-destructive" : ""} />{fieldError("productName")}</div>
              <div><Label className="text-xs text-muted-foreground">SKU</Label><Input value={form.productSku} onChange={(e) => update("productSku", e.target.value)} className="font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Material</Label><Input placeholder="Plástico, Metal, Tecido..." value={form.productMaterial} onChange={(e) => update("productMaterial", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Cor do Produto</Label><Input placeholder="Branco, Preto, Azul..." value={form.productColors} onChange={(e) => update("productColors", e.target.value)} /></div>
            </div>
          </section>

          {/* Print specs */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Palette} title="Especificações de Gravação" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Técnica de Gravação *</Label><Select value={form.technique} onValueChange={(v) => update("technique", v)}><SelectTrigger className={errors.technique ? "border-destructive" : ""}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{TECHNIQUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>{fieldError("technique")}</div>
              <div><Label className="text-xs text-muted-foreground">Detalhe da Gravação</Label><Input placeholder="Gravação Laser Escuro, Serigrafia 2 cores..." value={form.gravacaoDetalhe} onChange={(e) => update("gravacaoDetalhe", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Área de Gravação</Label><Input placeholder="Lado A, Frente, Tampa..." value={form.areaName} onChange={(e) => update("areaName", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Formato da Área</Label><Input placeholder="Retangular, Circular..." value={form.areaShape} onChange={(e) => update("areaShape", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Largura (cm)</Label><Input type="number" step="0.1" value={form.areaWidth} onChange={(e) => update("areaWidth", e.target.value)} className="font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Altura (cm)</Label><Input type="number" step="0.1" value={form.areaHeight} onChange={(e) => update("areaHeight", e.target.value)} className="font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Cores da Arte (Pantone)</Label><Input placeholder="Pantone 186C, Pantone 300C..." value={form.artColors} onChange={(e) => update("artColors", e.target.value)} /></div>
              <div><Label className="text-xs text-muted-foreground">Resolução (DPI)</Label><Input type="number" value={form.artDpi} onChange={(e) => update("artDpi", e.target.value)} className="font-mono" /></div>
              <AssetVersionUpdateBanner currentAssetId={form.artAssetId ?? null} onUpdate={handleVersionUpdate} />
              <ArtUploadField artFile={form.artFile} artFileDataUrl={form.artFileDataUrl} onUpload={handleArtUpload} onRemove={removeArt} uploading={uploading} onPickFromDam={() => setDamPickerOpen(true)} />
            </div>
          </section>

          {/* Production */}
          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={Hash} title="Produção" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Quantidade (peças) *</Label><Input type="number" min="1" placeholder="500" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} className={`font-mono ${errors.quantity ? "border-destructive" : ""}`} />{fieldError("quantity")}</div>
              <div><Label className="text-xs text-muted-foreground">Qtd. Compra</Label><Input type="number" min="1" placeholder="Igual à quantidade" value={form.qtdCompra} onChange={(e) => update("qtdCompra", e.target.value)} className="font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Qtd. Liberada para Personalização</Label><Input type="number" min="1" placeholder="Igual à quantidade" value={form.qtdLiberada} onChange={(e) => update("qtdLiberada", e.target.value)} className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3"><Label className="text-xs text-muted-foreground">Material de Evento?</Label><Switch checked={form.materialEvento} onCheckedChange={(v) => update("materialEvento", v)} /></div>
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3"><Label className="text-xs text-muted-foreground">Aprovar 1ª Peça?</Label><Switch checked={form.aprovarPrimeiraPeca} onCheckedChange={(v) => update("aprovarPrimeiraPeca", v)} /></div>
              <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3"><Label className="text-xs text-muted-foreground">Faz Parte de Kit?</Label><Switch checked={form.fazParteKit} onCheckedChange={(v) => update("fazParteKit", v)} /></div>
            </div>
          </section>

          {form.mockupImageUrl && (
            <section className="bg-card rounded-xl border border-border p-6">
              <SectionTitle icon={ImageIcon} title="Mockup Aprovado" />
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30"><img src={form.mockupImageUrl} alt="Mockup aprovado" className="w-full max-h-80 object-contain" /></div>
            </section>
          )}

          <section className="bg-card rounded-xl border border-border p-6">
            <SectionTitle icon={MessageSquare} title="Observações Técnicas" />
            <Textarea placeholder="Informações adicionais sobre acabamento, embalagem, tratamento de cores, cuidados especiais..." rows={4} value={form.observations} onChange={(e) => update("observations", e.target.value)} />
          </section>

          <div className="flex flex-col sm:flex-row gap-3 pb-10">
            <Button size="lg" className="flex-1 gap-2" onClick={handleSave} disabled={saved}><CheckCircle2 className="w-4 h-4" /> {saved ? "OS Salva ✓" : "Salvar Ordem de Serviço"}</Button>
            <Button size="lg" variant="secondary" className="flex-1 gap-2" onClick={handlePreviewPdf}><Eye className="w-4 h-4" /> Preview do PDF</Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handleDownloadPdf}><Download className="w-4 h-4" /> Preview + Baixar</Button>
          </div>
        </motion.div>
      </div>

      <PdfPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} pdfBlob={previewBlob} fileName={`${form.osNumber}.pdf`} />
      <AssetPicker open={damPickerOpen} onOpenChange={setDamPickerOpen} defaultAssetType="art" onSelect={handlePickFromDam} title="Escolher arte da biblioteca" />
    </div>
  );
};

export default ServiceOrder;
