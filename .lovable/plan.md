

## Refinar a navegação por teclado já existente

A base está implementada (`←/→` navega, `Enter` abre detalhes, `Esc` volta) em `DamPreviewPage.tsx` linhas 105-128. Vamos só preencher lacunas e tornar a UX mais profissional.

### Mudanças

**`src/features/dam/pages/DamPreviewPage.tsx`**

1. **Adicionar `Home` / `End`** para pular ao primeiro/último asset da lista atual — útil em listas grandes.

2. **Adicionar `j` / `k`** (estilo Vim) como aliases de `→` / `←`, alinhado com o resto da app que prioriza teclado (ver `mem://features/productivity-tools`).

3. **Comportamento de `Esc` quando o drawer está aberto**: hoje o `useEffect` curto-circuita com `if (detailAsset) return;`, então `Esc` no drawer só fecha o próprio drawer (já tratado pelo Radix). Manter — está correto, mas adicionar comentário explicando.

4. **Atualizar a dica do header** para refletir os novos atalhos: 
   `← / → (j/k) navegar · Home/End extremos · Enter detalhes · Z zoom · Esc voltar`

5. **Tornar a dica acessível em telas menores**: trocar `hidden md:block` por um `Popover`/`Tooltip` com ícone `Keyboard` (lucide) em mobile, mantendo o texto inline em ≥md. Isso evita o "hint" desaparecer silenciosamente.

### Critérios de aceite

- `Home` move para o primeiro asset (índice 0); `End` para o último (`assets.length - 1`).
- `j` avança e `k` retrocede, idênticos a `→` e `←`.
- Atalhos seguem ignorando inputs/textareas/contentEditable e o drawer aberto.
- A linha de atalhos no header lista todos os novos; em mobile aparece um ícone de teclado clicável que mostra a mesma legenda.
- Sem regressão nos atalhos atuais nem no `Z` do zoom (que já vive em `PreviewStage`).

