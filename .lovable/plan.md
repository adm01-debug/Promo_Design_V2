

## Log de auditoria por versão de asset

Cada upload de versão hoje cria uma linha em `assets` (que dispara `write_audit_log` via trigger). Os INSERTs ficam em `audit_log` mas não são expostos no drawer. Vou adicionar uma seção "Auditoria" dentro da aba "Versões" mostrando quem criou cada versão e o que mudou em relação à anterior.

### Mudanças

**`src/features/dam/hooks/use-asset-audit.ts`** (novo)
- Hook `useAssetAudit(asset: Asset | null)`:
  - Busca o chain completo de versões (root + descendants) por id
  - Faz `select * from audit_log where table_name='assets' and record_id in (chain_ids) order by created_at asc`
  - Retorna entradas tipadas `AssetAuditEntry { id, version, action, user_id, created_at, old_values, new_values, changed_fields }`
  - Computa `changed_fields` no cliente comparando `new_values` da versão N com `new_values` da versão N-1 (chain anterior), focando em campos relevantes: `name`, `tags`, `description`, `dominant_colors`, `asset_type`, `client_id`, `metadata`
  - Cache key: `["asset-audit", rootId]`

**`src/features/dam/components/AssetAuditTrail.tsx`** (novo)
- Renderiza dentro de um `<Collapsible>` "Histórico de auditoria" abaixo da lista de versões
- Cada entrada mostra:
  - Badge da versão (`v3`)
  - Autor (UUID truncado, mesma estratégia de `AssetVersionHistory`)
  - Timestamp relativo (`format(date, "dd/MM/yyyy HH:mm")`)
  - Lista compacta de campos alterados com chips coloridos: `tags`, `nome`, `descrição`, etc.
  - Botão "Comparar" que abre `AssetMetadataDiffDialog`
- Empty state: "Sem registros de auditoria para esta versão"

**`src/features/dam/components/AssetMetadataDiffDialog.tsx`** (novo)
- Dialog que recebe `previousValues` e `currentValues` (subset de campos relevantes)
- Layout 2 colunas (Antes/Depois) reutilizando o padrão visual do `AuditDiffDialog`:
  - Coluna esquerda: borda destrutiva, fundo `destructive/5`
  - Coluna direita: borda emerald, fundo `emerald/5`
  - Campos alterados com `bg-amber-500/15` e borda âmbar
- Renderiza tags como `<Badge>` lado a lado para comparação visual rápida
- Renderiza `dominant_colors` como swatches
- Demais campos como JSON inline

**`src/features/dam/components/AssetVersionHistory.tsx`** (modificar)
- Após a `<ul>` de versões, renderizar `<AssetAuditTrail asset={asset} />`
- Sem alterações nos filtros/persistência existentes

### Critérios de aceite

- Aba "Versões" mostra seção colapsável "Histórico de auditoria" abaixo da lista
- Cada entrada lista versão, autor, data e campos alterados (chips de "tags", "nome" etc.)
- Clicar em "Comparar" abre dialog com diff lado a lado destacando os campos modificados em âmbar
- Tags aparecem como badges comparáveis visualmente; cores dominantes como swatches
- INSERT (criação da versão) mostra "Criado" em vez de comparação; UPDATEs mostram diff vs estado anterior
- Empty state quando o asset ainda não tem auditoria ou só tem 1 versão sem updates
- Sem migração: usa `audit_log` existente; RLS já permite leitura para membros da org
- Sem regressão: filtros, persistência localStorage e seleção de versão continuam funcionando

