

## Exportar Brand Kit em PDF — já implementado, validar e refinar

O export já existe: `src/features/dam/lib/brand-kit-pdf.ts` (gera PDF A4 com header, swatches de cores, fontes, do/don't e notas) é chamado por `handleExportPdf` em `BrandGuidelinesPage.tsx`, que renderiza o botão **"Exportar PDF"** na top bar.

### Gaps a corrigir

1. **Posicionamento do botão** — está mal alinhado (`ml-2` solto fora do bloco `editable`). Quando o usuário não é editor, o botão Salvar some mas o Exportar fica deslocado. Reorganizar em um wrapper flex consistente.

2. **Logo no PDF nem sempre aparece** — `addImage(logoDataUrl, "PNG", ...)` é hardcoded `"PNG"`, mas a logo pode ser SVG/JPG/WebP. Detectar formato pelo prefixo `data:image/...;base64` e passar o tipo correto (jsPDF aceita `PNG`, `JPEG`, `WEBP`).

3. **Quebra de página inconsistente** — `drawSwatches` e o bloco de fontes não verificam `y > 270` antes de desenhar; cores secundárias podem ser cortadas em paletas grandes. Adicionar guard de `addPage()` antes de cada seção e dentro do loop de swatches.

4. **Contraste WCAG ausente** — o PDF não mostra os badges WCAG que existem na UI. Adicionar mini label `AA`/`AAA`/`FAIL` (vs branco) abaixo de cada swatch, em fonte 7pt, alinhado ao HEX.

5. **Sem feedback de progresso** — geração com logo grande pode demorar 1–2s. Mudar `handleExportPdf` para mostrar `toast.loading("Gerando PDF...")` → `toast.success` no fim, e desabilitar o botão durante geração (state `isExporting`).

6. **Nome de arquivo** — incluir data ISO curta: `brand-kit-{cliente}-{YYYY-MM-DD}.pdf` para versionamento manual.

### Mudanças

**`src/features/dam/lib/brand-kit-pdf.ts`**
- `detectImageFormat(dataUrl)` → retorna `"PNG" | "JPEG" | "WEBP"` baseado no prefixo MIME.
- `addImage(logoDataUrl, format, ...)` em vez de hardcoded `"PNG"`.
- Helper interno `ensureSpace(needed: number)` que faz `addPage()` + reset de `y` se `y + needed > 285`.
- Em `drawSwatches`: chamar `ensureSpace(sw + 14)` antes de cada swatch; se a linha estourar, ir pra próxima ANTES de desenhar (não depois).
- Adicionar `wcagLabel` abaixo de cada hex no swatch — usar `wcagBoth` de `color-contrast.ts` (já existe), formato `"AA · vs branco"` em 7pt.
- Antes de "Tipografia", "Do", "Don't", "Notas" → `ensureSpace(20)`.

**`src/features/dam/pages/BrandGuidelinesPage.tsx`**
- Reagrupar botões da top bar em um único `<div className="flex items-center gap-2">` contendo Salvar (condicional editable) + Exportar PDF (sempre visível).
- Novo state `const [isExporting, setIsExporting] = useState(false)`.
- `handleExportPdf` envolve em try/finally; `toast.loading` no início, `toast.success` no fim, `toast.error` em catch.
- Nome do arquivo: `brand-kit-${slug}-${new Date().toISOString().slice(0,10)}.pdf`.
- Botão Exportar com `disabled={isExporting}` e ícone `Loader2` animado quando true.

### Critérios de aceite

- Botão **"Exportar PDF"** visível para todos os papéis (editor e viewer), bem alinhado ao lado do Salvar.
- Clique gera download com nome `brand-kit-{cliente}-{2026-04-21}.pdf`.
- PDF contém: header com nome do cliente + logo (em qualquer formato suportado), swatches de cores primárias e secundárias com nome/HEX/badge WCAG, lista de fontes com uso/fonte, blocos Do (verde) e Don't (vermelho), notas opcionais.
- Paleta de 20+ cores não é cortada — quebra de página automática preserva todos os swatches.
- Toast `"Gerando PDF..."` → `"Brand kit exportado"` (ou erro claro se falhar).
- Botão fica desabilitado e mostra spinner durante geração.
- Sem regressão: salvar guidelines, editar cores/fontes/regras e preview ao vivo continuam funcionando.

