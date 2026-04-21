

## Brand Guidelines — já implementado, propostas de polimento

A tela `/clients/:clientId/brand` já existe e cobre todo o escopo solicitado:

| Requisito | Status atual |
|---|---|
| Editor de paleta primária | ✅ Color picker + hex + nome, add/remove |
| Editor de paleta secundária | ✅ Mesmo padrão |
| Lista de fontes | ✅ Nome, uso, fonte/link, add/remove |
| Regras Do | ✅ Textarea (uma por linha) com label verde |
| Regras Don't | ✅ Textarea (uma por linha) com label vermelho |
| Logo principal | ✅ AssetPicker integrado |
| Notas adicionais | ✅ Textarea |
| Preview aplicado | ✅ `BrandPreviewCard` com hero, tipografia, botões, paleta |
| RBAC | ✅ Edição gated em `owner/admin/designer` |
| Persistência | ✅ Hook `useBrandGuidelines` com upsert |

### Melhorias propostas (polimento premium)

Como o esqueleto está completo, sugiro 5 incrementos focados em **qualidade visual e UX**:

**1. Paleta — copy-to-clipboard + preview de contraste**
- Click no chip de cor copia o hex (toast "Copiado #FF5733")
- Mini-badge WCAG AA/AAA ao lado de cada cor (calcula contraste contra branco/preto)

**2. Fontes — load real do Google Fonts no preview**
- Quando o usuário digita "Inter", "Poppins", "Roboto"...: injetar `<link>` para Google Fonts dinamicamente para que o preview renderize com a fonte real, não fallback
- Detecção: tentar `https://fonts.googleapis.com/css2?family={nome}:wght@400;700`

**3. Regras Do/Don't — chips em vez de linhas**
- Manter textarea como modo edição rápida, mas exibir em **chips** com ícone ✓/✗ no preview-card (mais visual)
- Chips clicáveis para deletar individualmente

**4. Preview expandido — múltiplas seções**
- Aba "Card de marca" (atual) + aba "Aplicação completa" mostrando:
  - Header de site com logo + cores
  - Cartão de produto com tipografia
  - Combinações de cores (primária+secundária, gradiente)

**5. Export de brand kit (PDF)**
- Botão "Exportar PDF" no header que gera um PDF de 1-2 páginas com paleta, fontes, regras e logo (reutilizar pipeline `jspdf` já presente em `service-orders/lib/ServiceOrderPdf.ts` como base)

### Detalhes técnicos

- **Contraste WCAG**: função pura em `src/features/dam/lib/color-contrast.ts` — fórmula relative luminance + ratio
- **Google Fonts loader**: hook `useGoogleFont(name: string)` que injeta `<link>` único no `<head>` (cacheado por nome para evitar duplicatas)
- **Chips Do/Don't**: novo componente `RuleChips` com modo "edit" (textarea) e "view" (chips), toggle por botão
- **Aba Aplicação**: novo componente `BrandApplicationPreview` (header simulado + product card + gradiente)
- **PDF export**: `src/features/dam/lib/brand-kit-pdf.ts` usando `jsPDF`; layout simples 1 página (logo + paleta com swatches + fontes + regras)

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/features/dam/lib/color-contrast.ts` | Criar — utilitários WCAG |
| `src/features/dam/lib/google-fonts-loader.ts` | Criar — hook `useGoogleFont` |
| `src/features/dam/lib/brand-kit-pdf.ts` | Criar — gerador PDF |
| `src/features/dam/components/BrandPreviewCard.tsx` | Editar — copy hex + badge contraste + Google Fonts |
| `src/features/dam/components/BrandApplicationPreview.tsx` | Criar — preview avançado |
| `src/features/dam/components/RuleChips.tsx` | Criar — chips Do/Don't |
| `src/features/dam/pages/BrandGuidelinesPage.tsx` | Editar — abas de preview, botão Exportar PDF, RuleChips |

### Critérios de aceite

- Click em uma cor copia hex e mostra toast
- Cada cor tem badge "AA"/"AAA"/"FAIL" indicando contraste sobre branco
- Fontes do Google Fonts carregam de verdade no preview
- Aba "Aplicação" mostra header + product card simulados
- Botão "Exportar PDF" gera arquivo `brand-kit-{cliente}.pdf`
- Chips de Do/Don't são deletáveis individualmente

