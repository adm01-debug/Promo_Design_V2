# Relatório de Dependências e Cobertura das Edge Functions

## asset-ocr
- **Status**: Produção
- **Tabelas Usadas**:
  - `assets`: SELECT, UPDATE (status, ocr_text)
  - `ai_usage_log`: INSERT (tokens, custo, metadados)
- **Bucket Storage**: `assets` (createSignedUrl)
- **Variáveis de Ambiente**:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY`
- **Validação**: Zod Schema (assetId, filePath, mimeType)
- **Resiliência**: Fetch with Retry (Max 3, Exponential Backoff)

## mockup-ai
- **Status**: Produção
- **Tabelas Usadas**:
  - `organization_members`: SELECT (org_id)
  - `ai_usage_log`: INSERT (tokens, custo, metadados)
- **RPCs**:
  - `check_ai_quota`: Chamado antes de processar
- **Variáveis de Ambiente**:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY`
- **Validação**: Zod Discriminated Union (remove-bg, suggest-placement)
- **Resiliência**: Fetch with Retry (Max 3, Exponential Backoff)

## Cobertura de Testes
- Testes unitários para validação de entrada (Zod)
- Testes de integração para autenticação e erros 400
- Logs estruturados com requestId em todas as funções
