

## Estados de carregamento/progresso para PDFs (batch e resumo)

Hoje, ao gerar o **PDF consolidado** (`/service-orders` → "Exportar PDF") e o **Resumo do projeto** (`/clients` → "Resumo PDF"), o usuário só vê um spinner pequeno no botão. Para batches grandes (até 1000 OSs no consolidado, até 12 mockups no resumo), a geração pode levar 10-60s e parece travada — sem feedback de progresso real, com risco do usuário fechar a aba ou clicar de novo.

Vamos adicionar um overlay de progresso com etapas reais e contagem de itens processados em ambos os fluxos.

### Mudanças

**1. Novo componente compartilhado: `src/components/PdfProgressOverlay.tsx`**

Dialog modal não-fechável (sem `X`, sem overlay click) com:
- Título dinâmico ("Gerando PDF consolidado…" / "Gerando resumo do projeto…").
- `Progress` (shadcn) com valor 0-100.
- Label da etapa atual ("Buscando OSs", "Baixando mockups 5/12", "Montando páginas 23/87", "Finalizando").
- Contador "X de Y" quando aplicável.
- Tempo decorrido em segundos (atualiza a cada 500ms).
- Texto fixo: "Não feche esta aba. O download começa automaticamente."
- Sem botão cancelar nesta primeira versão (geração é síncrona via jsPDF; cancelar exigiria refatorar com `AbortSignal` — fora do escopo).

Props:
```ts
interface PdfProgressOverlayProps {
  open: boolean;
  title: string;
  stage: string;          // "Baixando mockups", "Montando páginas"
  current?: number;        // ex: 5
  total?: number;          // ex: 12
  percent: number;         // 0-100
}
```

**2. Editar `src/features/service-orders/lib/ServiceOrderBatchPdf.ts`**

Adicionar parâmetro opcional `onProgress?: (p: { stage: string; current: number; total: number; percent: number }) => void`:
- Após `drawCover` → emitir `{ stage: "Capa montada", current: 0, total: orders.length, percent: 5 }`.
- Dentro do loop `for (const order of orders)` → antes do `await drawOrderPage`, emitir `{ stage: "Montando OS", current: i+1, total: orders.length, percent: 5 + (i / orders.length) * 90 }`.
- Dentro de `drawOrderPage`, quando há `mockupImageUrl`, o `fetchAsDataUrl` pode demorar — sub-emitir `{ stage: "Baixando mockup", current: i+1, total: orders.length, percent: ... }` antes do fetch (callback opcional passado adiante).
- Após o loop e antes de retornar → `{ stage: "Finalizando", current: orders.length, total: orders.length, percent: 100 }`.

Yield para o browser pintar: a cada N iterações (ex: a cada 5 OSs), `await new Promise(r => setTimeout(r, 0))` para o React conseguir re-renderizar o overlay durante o loop síncrono.

**3. Editar `src/features/service-orders/lib/ClientSummaryPdf.ts`**

Mesma assinatura de `onProgress` opcional. Etapas:
- "Preparando capa" (5%).
- "Calculando KPIs" (15%).
- "Baixando mockups X/Y" durante o `Promise.all` — substituir por loop com contador incremental:
  ```ts
  let done = 0;
  const dataUrls = await Promise.all(
    withMockups.map(async (o) => {
      const url = await fetchAsDataUrl(o.mockupImageUrl);
      done++;
      onProgress?.({ stage: "Baixando mockups", current: done, total: withMockups.length, percent: 30 + (done / withMockups.length) * 50 });
      return url;
    })
  );
  ```
- "Montando galeria" (85%).
- "Finalizando" (100%).

**4. Editar `src/features/service-orders/pages/ServiceOrderList.tsx`**

- Estado `pdfProgress: { stage: string; current: number; total: number; percent: number } | null`.
- No `handleExportPdf`:
  - Trocar o `setExporting(true)` por `setPdfProgress({ stage: "Buscando OSs", current: 0, total: 0, percent: 0 })`.
  - Após o `supabase.from(...).select()` → `setPdfProgress({ stage: "Preparando dados", current: data.length, total: data.length, percent: 5 })`.
  - Passar `onProgress: setPdfProgress` para `generateBatchPdf`.
  - No `finally` → `setPdfProgress(null)`.
- Renderizar `<PdfProgressOverlay open={!!pdfProgress} title="Gerando PDF consolidado…" {...pdfProgress} />`.
- Manter o spinner no botão "Exportar PDF" quando `pdfProgress !== null`.

**5. Editar `src/features/clients/pages/ClientsPage.tsx`**

Mesma estrutura: estado `summaryProgress`, passar `onProgress` para `generateClientSummaryPdf`, renderizar `<PdfProgressOverlay open={!!summaryProgress} title={\`Gerando resumo — ${summaryClient?.name}\`} {...summaryProgress} />`. O Dialog de seleção de período fecha imediatamente ao clicar em "Gerar PDF" e o overlay assume o controle visual.

### Arquivos tocados

- `src/components/PdfProgressOverlay.tsx` (novo)
- `src/features/service-orders/lib/ServiceOrderBatchPdf.ts`
- `src/features/service-orders/lib/ClientSummaryPdf.ts`
- `src/features/service-orders/pages/ServiceOrderList.tsx`
- `src/features/clients/pages/ClientsPage.tsx`

### Comportamento

- Click em "Exportar PDF" / "Resumo PDF" → overlay aparece imediatamente com progresso 0%.
- Etapas atualizam em tempo real ("Baixando mockups 7/12 — 62%").
- Yield periódico evita freeze da UI durante batches grandes.
- Toast de sucesso após `doc.save()`; overlay desaparece.
- Em caso de erro: overlay fecha, toast de erro mostra mensagem.

### Critérios de aceite

- Overlay modal aparece em ambos os fluxos com `Progress` animada.
- Etapa textual muda conforme processamento ("Buscando OSs" → "Montando OS 23/87" → "Finalizando").
- Tempo decorrido visível em segundos.
- UI não congela durante batches de 100+ OSs (yield com `setTimeout(0)`).
- Overlay não pode ser fechado por click fora ou ESC.
- Botões de origem ficam desabilitados durante geração.
- Sem regressão no PDF gerado (mesmo conteúdo, mesmas imagens embutidas).

