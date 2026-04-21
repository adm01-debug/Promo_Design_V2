

## Edição inline de regras Do/Don't via chips

Os chips com ícone e botão de deletar já existem (`RuleChips.tsx`). Falta tornar a **adição** tão rápida quanto a remoção, eliminando a dependência do textarea como fluxo principal.

### Mudanças

**`src/features/dam/components/RuleChips.tsx`** — estender
- Nova prop opcional `onAdd?: (rule: string) => void`. Quando presente + `editable`, renderiza um chip-input inline ao final da lista:
  - `<input>` borderless dentro de um chip outline tracejado (`border-dashed`) com placeholder `"+ Adicionar regra"` (verde para do, vermelho para don't).
  - Enter ou vírgula → chama `onAdd(value.trim())` e limpa.
  - Esc → cancela e limpa.
  - Validação: ignora vazio e duplicatas (case-insensitive); flash visual `border-destructive` por 1s se inválido.
- Botão `X` de remoção ganha `aria-label="Remover regra: {item}"` para acessibilidade.

**`src/features/dam/pages/BrandGuidelinesPage.tsx`** — refatorar fluxo
- Substituir os dois Cards Do/Don't por uma versão centrada em chips:
  - Header: `Label` "✓ Do" / "✗ Don't" + contador `({doList.length})`.
  - `<RuleChips>` com `onAdd`, `editable`, `onRemove`.
  - `<Collapsible>` "Editar em massa (texto)" abaixo, fechado por padrão. Ao expandir, mostra o `<Textarea>` atual (uma regra por linha) com botão "Aplicar" que faz parse e substitui a lista.
- Handlers novos:
  - `addDo(rule)` → `setDoRules([...doList, rule].join("\n"))` se não duplicar.
  - `addDont(rule)` idem.
- Manter `doList`/`dontList` como single source of truth (já são derivados de `doRules`/`dontRules`).

### Critérios de aceite

- Adicionar regra: digitar no chip-input + Enter cria novo chip imediatamente, sem tocar no textarea.
- Remover regra: clicar `X` em qualquer chip remove só aquela, sem afetar as outras.
- Duplicata (case-insensitive) é rejeitada com flash vermelho de 1s, sem toast (não-bloqueante).
- "Editar em massa" expande textarea para colar lista grande; botão "Aplicar" substitui chips.
- Viewer (não-editor): vê chips sem botão `X` e sem chip-input.
- Salvar persiste corretamente (continua serializando como `string[]` no DB).
- Sem regressão: contagem, ordem das regras, e exportação no PDF (`doList`/`dontList`) continuam idênticas.

