

## Compartilhar link do preview com asset + filtros atuais

Adicionar um botão "Copiar link" no header de `/dam/preview` que copia para a área de transferência a URL absoluta atual (origin + path + query string) já contendo `?asset=` e todos os filtros ativos. Quem abrir o link cai no mesmo asset com os mesmos filtros aplicados, sem nada extra para configurar — a sincronização URL ↔ estado já existe.

### Mudanças

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**

1. **Garantir que `?asset=` está sempre presente na URL antes de copiar**
   - Hoje, quando o usuário acessa `/dam/preview` sem `?asset=`, a URL pode ficar sem o parâmetro até a primeira navegação. Antes de copiar, montar a URL final concatenando:
     - `window.location.origin + window.location.pathname`
     - `?` + query atual (de `searchParams`) com `asset=<activeAsset.id>` garantido (sobrescreve se ausente).
   - Isso assegura que o link compartilhado sempre carrega o asset visível no momento do clique, mesmo que a URL atual ainda não reflita.

2. **Botão "Copiar link" no header**
   - Adicionar entre o chip de sincronização (`{n}/{total}` + Link2) e o botão de "Pré-visualização rápida":
     - Botão `variant="outline"` `size="sm"` com ícone `Share2` (lucide) e label "Copiar link" (no mobile só ícone).
     - `aria-label="Copiar link compartilhável do asset atual"`.
     - Atalho de teclado `Shift+C` (não conflita com `C` que copia URL do arquivo no `PreviewStage`): registrar via efeito de keydown próprio na página, ignorando inputs/textareas/contentEditable e teclas modificadoras.
   - Estado `copied: boolean` com timeout de 1.5s: ícone troca para `Check` e texto para "Copiado" enquanto ativo.
   - Toast de sucesso (`sonner`): "Link copiado" com descrição "Quem abrir verá o mesmo asset e filtros." Se a clipboard API falhar, fallback `document.execCommand("copy")` ou toast de erro com a URL exibida em texto monoespaçado para cópia manual (via `toast` com componente customizado simples).
   - Desabilitado quando `assets.length === 0` ou `!activeAsset`.

3. **Helper interno `buildShareableUrl()`**
   - Função local na página que retorna `string`:
     ```ts
     const buildShareableUrl = (): string | null => {
       if (!activeAsset) return null;
       const params = new URLSearchParams(searchParams);
       params.set("asset", activeAsset.id);
       const qs = params.toString();
       return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
     };
     ```

4. **Modo Compare (opcional, mesma sessão)**
   - Quando `compare.isActive` (modo comparação ativo), o botão muda label para "Copiar link da comparação" e inclui na query um parâmetro extra `compare=<id1>,<id2>,...` com os ids selecionados. O reading side já não trata `compare=` hoje — adicionar leitura no mount: se `compare` query existe e tem ≥2 ids válidos presentes nos resultados, ativar o modo Compare e selecionar esses ids. Se decidirmos manter escopo enxuto, este item pode ficar de fora — incluir apenas se for natural; caso contrário só copia o `?asset=` atual e o comparador é aberto manualmente.

### Comportamento

- Click no botão → URL absoluta com `?asset=<id>&<filtros>` é copiada; toast "Link copiado".
- Atalho `Shift+C` faz o mesmo.
- Quem abrir o link cai no mesmo asset, com os mesmos filtros (busca, tipos, cliente, tags, ordenação, arquivados) já aplicados — funciona porque `useDamFilters` já hidrata estado de URL.
- Botão fica desabilitado quando não há asset ativo.

### Critérios de aceite

- Botão "Copiar link" visível no header do preview, ao lado do chip de sincronização.
- Click copia URL absoluta com `?asset=` + filtros atuais; toast confirma.
- Atalho `Shift+C` funciona fora de inputs.
- Abrir o link em outra aba/usuário restaura o mesmo asset selecionado e os mesmos filtros, sem regressão em back/forward, banner "Continuar de onde parou", popover de motivos, ou modo Compare.
- Acessibilidade: `aria-label`, foco visível, estado "Copiado" anunciado por `aria-live` discreto.

