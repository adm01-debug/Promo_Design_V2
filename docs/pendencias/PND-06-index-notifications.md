---
ID: PND-06
Titulo: Indice parcial notifications não lidas
Estado: DONE
Fonte: docs/senior-backend-audit-2026-07.md [Baixa]
Data: 2026-11-21
---

# PND-06 - Indice parcial notifications não lidas

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-backend-audit-2026-07.md [Baixa]

## Descricao

Polling 15s de notificacoes escaneia; criar indice parcial (user_id, created_at DESC) WHERE read=false.

## Evidencia / Acao

Indice parcial ja existente no head `d2004c6e` na migration `supabase/migrations/20260711192616_c4a7442b-5cc5-4e13-bb8b-c7e94e4c0610.sql`: `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE read = false;` + `DROP INDEX IF EXISTS public.idx_notifications_user_read;`. O polling em `src/hooks/use-notifications.ts` consulta `.order("created_at", { ascending: false })` + `.eq("read", false)` — exatamente o padrao coberto pelo indice. Sem DDL pendente.
