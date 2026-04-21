

## Validação de tags no upload

Hoje `TagChipsInput` já normaliza (trim + lowercase) e bloqueia duplicatas/vazias silenciosamente, mas não mostra feedback. Além disso, `AssetUploadDialog` permite enviar com qualquer estado de tags. Vamos endurecer e dar feedback visível.

### Mudanças

**`src/features/dam/components/TagChipsInput.tsx`**
- Adicionar prop opcional `error?: string` e `onValidationChange?: (err: string | null) => void`
- Em `addTag(raw)`:
  - normalizar: `raw.trim().toLowerCase().replace(/\s+/g, " ")`
  - se vazio após trim → setar erro inline "Tag não pode ser vazia"
  - se duplicada → erro "Tag já adicionada"
  - se exceder `maxTags` → erro "Máximo de N tags"
  - se passar regex inválida (apenas `[a-z0-9-_ ]`, 1–30 chars) → erro "Use letras, números, - ou _"
- Limpar erro automaticamente após 2.5s ou ao digitar de novo
- Renderizar mensagem de erro abaixo do container (texto `text-destructive text-xs mt-1`)
- Borda do container vira `border-destructive` quando há erro

**`src/features/dam/components/AssetUploadDialog.tsx`**
- Antes de `handleSubmit`, validar `tags`:
  - Deduplica defensivamente (mesmo já vindo limpo do input)
  - Se houver tag inválida residual → bloquear submit + `toast.error("Corrija as tags antes de enviar")`
- Não bloqueia upload se tags estiver vazia (tags são opcionais), só se tiver entrada inválida no campo (draft pendente com erro)
- Passar handler de erro pro `TagChipsInput` para refletir estado no botão "Enviar" (desabilitado enquanto houver erro de tag)

**Sem mudanças** em banco, RLS, hooks ou outros componentes.

### Critérios de aceite

- Tentar adicionar tag vazia mostra erro inline ("Tag não pode ser vazia")
- Tentar adicionar tag duplicada (case-insensitive, com espaços extras) mostra "Tag já adicionada"
- Tags são salvas sempre normalizadas (trim, lowercase, espaços colapsados)
- Caracteres inválidos rejeitados com mensagem clara
- Limite de tags mostra erro ao tentar exceder
- Botão "Enviar" fica desabilitado enquanto houver erro ativo no campo de tags
- Erro desaparece ao digitar novamente ou após 2.5s
- Sem regressão: tags vazias continuam permitidas (campo opcional), sugestões continuam funcionando, modo versão segue herdando tags do parent

