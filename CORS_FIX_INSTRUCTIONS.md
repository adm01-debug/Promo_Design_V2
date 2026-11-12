# Correção de CORS para Edge Functions do Supabase

## 🔍 Problema Identificado

A Edge Function `admin-maintenance` e várias outras estão bloqueando requisições de `http://localhost:8081` porque o `ALLOWED_ORIGINS` em `supabase/functions/_shared/cors.ts` só permite domínios do Lovable:

```typescript
const ALLOWED_ORIGINS = [
  "https://id-preview--5da5ba25-dbc3-474e-b521-f7c17b3151a4.lovable.app",
  "https://lovable.app",
];
```

## ✅ Correção Aplicada (Local)

O arquivo [supabase/functions/_shared/cors.ts](supabase/functions/_shared/cors.ts) foi atualizado para incluir origens de desenvolvimento local:

```typescript
const ALLOWED_ORIGINS = [
  "https://id-preview--5da5ba25-dbc3-474e-b521-f7c17b3151a4.lovable.app",
  "https://lovable.app",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];
```

## 🚀 Como Fazer Deploy

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/fygxlswpkjtjpcefjfty/functions
2. Clique em `admin-maintenance`
3. Copie e cole o conteúdo de `supabase/functions/_shared/cors.ts` no início do arquivo
4. Faça o mesmo para outras functions que usam `_shared/cors.ts`:
   - `admin-maintenance`
   - Outras functions admin

### Opção 2: Via CLI (requer login)

```bash
# Login primeiro
supabase login

# Deploy todas as funções
supabase functions deploy admin-maintenance
supabase functions deploy --all
```

## 📋 Edge Functions que provavelmente usam o mesmo helper

Procure por `getCorsHeaders` ou `import { getCorsHeaders }` em `supabase/functions/*/index.ts` para identificar todas as funções afetadas:

```bash
grep -r "getCorsHeaders" supabase/functions/
```

Cada uma dessas funções precisa ser redeployada após a mudança no `_shared/cors.ts`.

## ⚠️ Importante

O helper `_shared/cors.ts` é **compartilhado** entre todas as Edge Functions do projeto. Modificá-lo localmente não afeta as funções em produção até que cada função seja redeployada com o novo helper.

## 🎯 Status Atual

- ✅ Arquivo `cors.ts` atualizado localmente
- ⏳ Aguardando deploy para produção
- 💡 A página `/organization` funciona parcialmente - algumas funções admin estão sendo bloqueadas
