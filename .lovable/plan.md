

## Busca por OCR no DAM — encontrar imagens pelo texto interno

Adicionar extração de texto (OCR) em assets de imagem no momento do upload e permitir que a busca atual (`/dam` e `AssetPicker`) também procure dentro desse texto, marcando os hits com badge "OCR".

### Backend

**Migração SQL**:
- `ALTER TABLE public.assets ADD COLUMN ocr_text text NULL;`
- `ALTER TABLE public.assets ADD COLUMN ocr_status text NOT NULL DEFAULT 'none';` (`none` | `pending` | `done` | `failed` | `skipped`)
- Índice GIN trigram: `CREATE INDEX assets_ocr_text_trgm_idx ON public.assets USING gin (ocr_text gin_trgm_ops);`
- Atualizar `search_assets_ranked`:
  - `WHERE` ganha `OR ocr_text ILIKE '%query%' OR similarity(coalesce(ocr_text,''), _query) > 0.1`
  - `rank` passa a somar `+ 0.2 * similarity(coalesce(ocr_text,''), _query)`
  - Retornar nova coluna `ocr_match boolean` (true quando o match veio do `ocr_text` e não do nome/descrição) para o frontend exibir badge.

**Edge Function nova `supabase/functions/asset-ocr/index.ts`**:
- CORS + JWT obrigatório (padrão da memória `ai-integration`).
- Body Zod: `{ assetId: string (uuid), filePath: string, mimeType: string }`.
- Verifica que `mimeType` começa com `image/` (skip outros → grava `ocr_status='skipped'`).
- Cria signed URL do bucket `assets` (1h), baixa imagem, converte para base64.
- Chama Lovable AI Gateway com `google/gemini-3-flash-preview` via tool calling estruturado:
  - Tool `extract_text` com schema `{ text: string, has_text: boolean }`.
  - Prompt: "Extraia todo texto visível na imagem. Preserve quebras de linha. Se não houver texto, retorne has_text=false."
- Atualiza `assets`: `ocr_text` (truncado a 5000 chars), `ocr_status='done'` (ou `failed` em erro). Retorna `{ ok, length }`.
- Trata 429/402 do gateway gravando `ocr_status='failed'` e devolvendo erro amigável.

### Frontend

**1. Disparo automático em `use-asset-upload.ts`**
- Após `create.mutateAsync`, se `mime_type.startsWith("image/")` e arquivo ≤ 10MB, dispara `supabase.functions.invoke("asset-ocr", { body: {...} })` em background (sem bloquear UI). Falha silenciosa — `ocr_status` cobre o estado.
- `dam-upload-image-max-mb` controlado por constante (default 10).

**2. Reprocesso manual no `AssetDetailDrawer`**
- Botão "Extrair texto (OCR)" aparece para assets de imagem. Estados: "Extrair", "Processando…" (quando `ocr_status='pending'`), "Reprocessar" (quando `done`/`failed`).
- Mostra preview do `ocr_text` (collapsible, max 6 linhas) com badge do status.

**3. UI de busca**
- `Input` de busca em `DamLibraryPage` ganha hint placeholder: "Buscar por nome, descrição ou texto da imagem (OCR)".
- Em `AssetCard` e `AssetListView`: quando o item vem com `ocr_match=true`, exibir badge pequeno "OCR" no canto. Tipos `Asset` ganham campo opcional `ocr_match?: boolean` (só populado pela RPC).
- `useAssets` propaga `ocr_match` quando vier da RPC; sort `relevance` agora vale também só com OCR (sem mudança de UX adicional).

**4. Indexação retroativa**
- Botão "Indexar OCR pendente" em `AssetDetailDrawer`? Não — em vez disso, criar uma **action no command palette**: "DAM: Indexar OCR de imagens pendentes". Roda em loop client-side: busca até 100 assets de imagem com `ocr_status='none'` da org atual, dispara a edge function 1 a 1 com 500ms de delay (evita 429), mostra toast com progresso.

### Detalhes técnicos

- **Modelo**: `google/gemini-3-flash-preview` (texto + imagem, rápido e barato — suficiente para OCR de logos/artes/banners).
- **Privacidade**: imagens só são lidas pelo edge function autenticado; nenhum texto OCR vai para o client a não ser do próprio usuário (RLS de `assets` cobre).
- **Performance**: trigram index garante `ILIKE` rápido; truncar `ocr_text` a 5000 chars evita inflar payload do `select *`.
- **Tipos**: regenerar `src/integrations/supabase/types.ts` (auto), e estender manualmente `Asset` com `ocr_text?: string | null`, `ocr_status?: string`, `ocr_match?: boolean`.
- **Compatibilidade**: assets pré-existentes ficam `ocr_status='none'` e seguem buscáveis por nome/descrição como hoje — sem regressão.
- **Sem mudança de RLS**: `ocr_text` herda as políticas existentes da tabela `assets`.

### Critérios de aceite

- Upload de imagem dispara OCR em background; em ~5s o `ocr_text` aparece no drawer de detalhes.
- Busca por uma palavra que existe **dentro** da imagem (não no nome) retorna o asset; card mostra badge "OCR".
- Botão "Reprocessar" no drawer atualiza `ocr_text` e `ocr_status`.
- Command Palette ganha ação para indexar pendentes; toast informa progresso e total.
- Não-imagens (PDF, SVG, doc) ficam com `ocr_status='skipped'` e não disparam edge function.
- `docs/FEATURES.md`: nova linha na seção 6 "Busca por OCR (texto em imagens)" → ✅ apontando para `asset-ocr` edge function + migração.

