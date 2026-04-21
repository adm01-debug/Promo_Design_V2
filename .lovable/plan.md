

## Atalhos avançados e navegação acessível na preview

Hoje a preview tem `Enter` (abre drawer), `Esc` (volta à biblioteca) e setas/`j`/`k`/`Home`/`End` para navegar. Faltam dois refinamentos pedidos:

1. **`Ctrl/Cmd+Enter`** → abrir o asset ativo em **nova aba** (deep link `/dam/preview?asset=<id>&...filtros`), útil para comparar dois assets lado a lado.
2. **`Tab`/`Shift+Tab` + `Esc` acessíveis** → atualmente o handler global usa `e.preventDefault()` em `Esc` mesmo quando o foco está em um elemento focável legítimo (sidebar, botões). Vamos melhorar a hierarquia de Esc e garantir que a ordem natural de Tab funcione bem.

### Mudanças

**`src/features/dam/pages/DamPreviewPage.tsx`**

1. **`Ctrl/Cmd+Enter` → nova aba**:
   - No handler `onKey`, antes do branch atual de `Enter`, detectar `e.key === "Enter" && (e.ctrlKey || e.metaKey)`.
   - Construir a URL: `/dam/preview?${queryString sem leading "?"}&asset=${activeAsset.id}` (mesclar com `queryString` atual de `useDamFilters`, garantindo `asset` presente sem duplicar).
   - `window.open(url, "_blank", "noopener,noreferrer")`.
   - Continua respeitando guards de input/textarea/contentEditable e drawer aberto.

2. **Hierarquia de `Esc` mais inteligente**:
   - Se o `detailAsset` (drawer) está aberto → não interceptar (Radix Sheet já fecha com Esc).
   - Se o foco está dentro de um `<input>`/`<textarea>` (ex: campo de busca da sidebar) → não voltar à biblioteca; em vez disso, fazer `target.blur()` para liberar foco (UX comum: 1º Esc tira foco, 2º Esc volta).
   - Caso contrário, comportamento atual: navegar para `/dam${queryString}`.

3. **Suporte a Tab acessível**:
   - Remover qualquer `tabIndex={-1}` desnecessário do container raiz (verificar — atualmente não tem, ok).
   - Garantir que os botões do `PreviewStage` (Copiar/Baixar/Detalhes/Setas) já têm `aria-label` e são focáveis na ordem natural (já estão).
   - Adicionar `role="region"` + `aria-label="Pré-visualização de assets"` no container principal para melhor leitura por screen readers.
   - Os atalhos de letra única (`j`/`k`/`c`/`d`/`z`) já ignoram quando o foco está em input — mantém Tab/foco totalmente livre.

4. **Atualizar a legenda de atalhos** no header e `PopoverContent` mobile:
   `← / → (j/k) navegar · Home/End extremos · Enter detalhes · Ctrl+Enter nova aba · Z zoom · C copiar · D baixar · Esc voltar`

### Critérios de aceite

- `Ctrl+Enter` (Win/Linux) e `Cmd+Enter` (Mac) abrem `/dam/preview?...&asset=<id-atual>` em nova aba, preservando todos os filtros atuais.
- `Enter` simples continua abrindo o drawer de detalhes na aba atual.
- `Esc` com foco em um input da sidebar apenas tira o foco; um segundo `Esc` (ou `Esc` em foco neutro) volta à biblioteca.
- `Esc` com o drawer aberto fecha o drawer (Radix), sem voltar à biblioteca.
- `Tab`/`Shift+Tab` percorrem em ordem lógica: busca → filtros da sidebar → botões do overlay (Copiar/Baixar/Detalhes/zoom) → setas de navegação → thumbs do strip.
- Container principal expõe `role="region"` + `aria-label`.
- Legenda de atalhos atualizada no header e popover mobile.
- Sem regressão nos atalhos existentes (setas, j/k, Home/End, c/d/z, Enter simples).

