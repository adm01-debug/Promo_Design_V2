

## Otimizar `search_assets_ranked` para queries mais rápidas

O RPC atual sempre roda 5 condições no `WHERE` (ILIKE + similarity em `name`, `description`, `ocr_text`) mesmo quando isso não faz sentido, e a expressão `'%' || _query || '%'` com wildcard à esquerda **não usa o índice GIN trigram** sem o operador `%` (similarity). Além disso, quando `_query` é vazio o RPC ainda calcula similarity para tudo. Vamos reescrever a função para:

1. Curto-circuitar quando `_query` é vazio/nulo (sem filtro de texto, sem cálculo de rank).
2. Usar o operador `%` (trigram) que aciona o índice GIN, em vez de só ILIKE com `%...%`.
3. Garantir índices GIN trigram em `name`, `description` e `ocr_text`.

### Migração SQL

**Índices** (criar se não existirem — usar `IF NOT EXISTS`):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON public.assets USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_description_trgm
  ON public.assets USING gin (description gin_trgm_ops)
  WHERE description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_ocr_text_trgm
  ON public.assets USING gin (ocr_text gin_trgm_ops)
  WHERE ocr_text IS NOT NULL;

-- Suporte para filtros frequentes combinados com a busca
CREATE INDEX IF NOT EXISTS idx_assets_org_archived_created
  ON public.assets (organization_id, is_archived, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_tags_gin
  ON public.assets USING gin (tags);
```

**Reescrever `search_assets_ranked`** com dois caminhos no `WHERE`:

```sql
CREATE OR REPLACE FUNCTION public.search_assets_ranked(
  _org_id uuid, _query text,
  _client_id uuid DEFAULT NULL,
  _asset_types asset_type[] DEFAULT NULL,
  _tags text[] DEFAULT NULL, _tags_mode text DEFAULT 'all',
  _include_archived boolean DEFAULT false,
  _limit integer DEFAULT 24, _offset integer DEFAULT 0
) RETURNS TABLE (...same columns...)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  WITH q AS (
    SELECT NULLIF(btrim(_query), '') AS term
  ),
  filtered AS (
    SELECT a.*,
      CASE
        WHEN (SELECT term FROM q) IS NULL THEN 0::real
        ELSE (
          similarity(a.name, (SELECT term FROM q))
          + 0.3 * similarity(coalesce(a.description, ''), (SELECT term FROM q))
          + 0.2 * similarity(coalesce(a.ocr_text, ''), (SELECT term FROM q))
        )::real
      END AS rank,
      CASE
        WHEN (SELECT term FROM q) IS NULL THEN false
        ELSE (
          (coalesce(a.ocr_text, '') % (SELECT term FROM q)
           OR coalesce(a.ocr_text, '') ILIKE '%' || (SELECT term FROM q) || '%')
          AND NOT (
            a.name % (SELECT term FROM q)
            OR a.name ILIKE '%' || (SELECT term FROM q) || '%'
            OR coalesce(a.description, '') ILIKE '%' || (SELECT term FROM q) || '%'
          )
        )
      END AS ocr_match
    FROM public.assets a
    WHERE a.organization_id = _org_id
      AND is_member_of(auth.uid(), a.organization_id)
      AND (_include_archived OR a.is_archived = false)
      AND (_client_id IS NULL OR a.client_id = _client_id)
      AND (_asset_types IS NULL OR a.asset_type = ANY(_asset_types))
      AND (
        _tags IS NULL OR array_length(_tags, 1) IS NULL
        OR (_tags_mode = 'all' AND a.tags @> _tags)
        OR (_tags_mode = 'any' AND a.tags && _tags)
      )
      AND (
        (SELECT term FROM q) IS NULL
        OR a.name % (SELECT term FROM q)
        OR coalesce(a.description, '') % (SELECT term FROM q)
        OR coalesce(a.ocr_text, '') % (SELECT term FROM q)
        OR a.name ILIKE '%' || (SELECT term FROM q) || '%'
      )
  ),
  counted AS (SELECT COUNT(*) AS c FROM filtered)
  SELECT f.id, f.organization_id, ..., f.rank, f.ocr_match,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN (SELECT term FROM q) IS NULL THEN 0 ELSE f.rank END DESC,
    f.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;
```

Antes de aplicar `set_limit(0.1)` por sessão é inviável (é estado de sessão), então deixamos o threshold padrão (0.3). O operador `%` usa o `pg_trgm.similarity_threshold` configurado no banco.

### Mudanças principais vs. versão atual

| Aspecto | Antes | Depois |
|---|---|---|
| Query vazia | Calcula similarity em 3 colunas + 5 condições ILIKE/sim | `term IS NULL` curto-circuita: rank=0, sem WHERE de texto |
| Wildcard ILIKE | Só `ILIKE '%x%'` (não usa GIN) | Combina `%` (trigram, usa GIN) com fallback ILIKE para substring exata |
| Índices | Sem GIN explícito em name/desc/ocr | 3 GIN trigram + composto (org, archived, created_at) + GIN tags |
| `coalesce(...) ILIKE` em 3 colunas | Sim (sempre) | Apenas em `name` como complemento ao trigram |

### Validação no frontend

`useAssets` (`src/features/dam/hooks/use-assets.ts`) **não muda** — assinatura do RPC é a mesma (mesmas colunas retornadas, mesmos parâmetros). Os testes em `use-assets.test.ts` continuam válidos.

### Critérios de aceite

- Migração aplicada cria os 5 índices (idempotentes via `IF NOT EXISTS`).
- `EXPLAIN ANALYZE` em `search_assets_ranked(org, 'logo')` mostra `Bitmap Index Scan` em `idx_assets_name_trgm` (e/ou `idx_assets_ocr_text_trgm`) em vez de `Seq Scan`.
- Chamar `search_assets_ranked(org, '')` ou com whitespace retorna até 24 ativos sem filtro de texto e sem cálculo de similarity (rank=0 para todos), respeitando os outros filtros.
- Com `_query='logo azul'` retorna os mesmos resultados de antes (mesma ordenação por rank desc, created_at desc).
- `ocr_match` continua `true` apenas quando o match veio de `ocr_text` e não de `name`/`description`.
- Frontend (`/dam` com sortBy=relevance) continua funcionando sem alteração; testes existentes passam.

