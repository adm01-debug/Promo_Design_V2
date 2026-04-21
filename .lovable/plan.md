

## Exportação PDF — OS individual já existe, faltam exports compartilháveis

Hoje `generateServiceOrderPdf` gera o PDF de **uma OS** (botão Download na tela de edição). Vou adicionar **dois exports novos** focados em compartilhamento com cliente:

### 1. PDF de lote de OSs (lista filtrada)

Na tela `/mockup/service-orders` (ServiceOrderList), botão **"Exportar PDF"** no header gera um PDF consolidado com:
- Capa com logo Promo Brindes, contagem de OSs, filtros aplicados (status, busca), data de geração
- Tabela resumo: nº OS · cliente · produto · técnica · qtd · status · entrega
- Uma página por OS expandida (reusa layout simplificado do `generateServiceOrderPdf`, sem o verso de produção)
- Footer com paginação

Útil para enviar ao cliente um pacote de OSs em produção/aprovação.

### 2. PDF "Resumo do Projeto" por cliente

Na `ClientsPage` (e na ficha do cliente), botão **"Resumo PDF"** gera um relatório executivo do cliente:
- Capa com nome/empresa do cliente e período (últimos 90 dias, configurável)
- KPIs: total de OSs, qtd total de peças, OSs por status (donut), técnicas mais usadas (barras top 5)
- Timeline cronológica de OSs (data · nº · produto · técnica · status)
- Galeria de mockups (até 12 thumbnails das OSs com `mockup_image_url`)
- Footer com branding

Compartilhável como "fechamento" ou "status report" do cliente.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/service-orders/lib/ServiceOrderBatchPdf.ts` | Criar — `generateBatchPdf(orders, filters, logoDataUrl)` |
| `src/features/service-orders/lib/ClientSummaryPdf.ts` | Criar — `generateClientSummaryPdf(client, orders, logoDataUrl, periodDays)` |
| `src/features/service-orders/pages/ServiceOrderList.tsx` | Editar — botão "Exportar PDF" no header (usa orders já filtradas, busca todos via `pageSize: 1000` quando exporta) |
| `src/features/clients/pages/ClientsPage.tsx` | Editar — botão "Resumo PDF" por linha + dialog de seleção de período (30/90/365 dias) |
| `src/features/clients/hooks/use-clients.ts` | Editar (se necessário) — helper para puxar OSs do cliente filtradas por período |

### Detalhes técnicos

- **Stack**: `jspdf` + `jspdf-autotable` (já no projeto)
- **Logo**: reusa `getLogoDataUrl()` do `logo-loader.ts`
- **Imagens**: `mockup_image_url` é URL pública; carregar via `fetch` → blob → dataURL antes de `addImage` (em paralelo com `Promise.all`, com cap de 12)
- **Performance**: para batch grande, `pageSize: 1000` num `useServiceOrders` chamado on-demand (não no render); loading state durante geração
- **Filtros no PDF**: serializar status/busca atuais no header da capa ("Status: Em produção · Busca: ‘capacete’")
- **Donut/barras**: desenhar manualmente no canvas (`doc.circle`/`doc.rect`) — sem dependências novas
- **Validação**: se cliente não tem OSs no período, dialog informa e não gera
- **Naming**: `ordens-servico-{YYYYMMDD}.pdf` e `resumo-{cliente-slug}-{YYYYMMDD}.pdf`

### Critérios de aceite

- Botão "Exportar PDF" em `/mockup/service-orders` gera PDF com capa + tabela + página por OS, respeitando filtros ativos
- Botão "Resumo PDF" em `/clients` (por linha) abre dialog com seletor de período e gera relatório executivo
- Ambos os PDFs incluem logo Promo Brindes, paginação e branding consistente
- Mockups embarcados nas thumbnails do resumo
- Loading state visível durante geração (>1s para batch grande)
- Sem regressão no PDF individual existente

