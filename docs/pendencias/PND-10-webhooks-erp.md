---
ID: PND-10
Titulo: Webhooks de saida para OS concluidas (ERP)
Estado: CODE_DONE - AGUARDA APLICACAO DA MIGRATION + SECRETS
Fonte: docs/enterprise-audit-report.md [lacuna]
Data: 2026-11-21
---

# PND-10 - Webhooks de saida para OS concluidas (ERP)

## Estado

Codigo completo e testado contra Postgres 17 real. Falta **aplicar a migration em producao**
e configurar 3 secrets. Enquanto isso a fila nao existe no banco (RPCs retornam HTTP 404).

## Fonte

docs/enterprise-audit-report.md [lacuna]

## Descricao

Sincronizar OS com faturamento externo via webhook. Decisao de negocio do dono: **todos** os
eventos de OS (criacao, edicao, mudanca de status, cancelamento, reabertura e exclusao).

## O que existe no codigo

- `supabase/migrations/20261121095000_os_erp_webhooks.sql`
  - Tabela `os_webhook_queue` (RLS ligada, coalescing por `os_id` + `event`).
  - `os_webhook_payload()`, `enqueue_os_webhook()`, trigger `trg_os_webhook_enqueue`.
  - Mapeamento do trigger: INSERT -> `os.created`; status mudou -> `os.status_changed` (com
    `previous_status`); `deleted_at` setado -> `os.deleted`; conteudo mudou -> `os.updated`;
    DELETE fisico -> `os.deleted` com payload do OLD.
  - `dequeue_os_webhooks()`, `mark_os_webhook_delivered()`, `mark_os_webhook_failed()`
    (backoff exponencial em `next_attempt_at`) e `run_os_webhook_dispatcher()` + cron
    `os-webhook-dispatcher-every-minute`.
- `supabase/functions/os-webhook-dispatcher/` (Deno)
  - Auth por Bearer `service_role` ou header `x-cron-secret`.
  - HMAC-SHA256 no header `X-Webhook-Signature: sha256=...`.
  - Self-disable se `ERP_WEBHOOK_URL`/`ERP_WEBHOOK_SECRET` ausentes (nao quebra, nao polui fila).
  - Batch de 25, `POST_TIMEOUT_MS = 15_000`.

## Bug P0 encontrado e corrigido nesta sessao (PR #76)

O cron chamava `extensions.net.http_post(...)`. `CREATE EXTENSION pg_net WITH SCHEMA extensions`
instala as funcoes no schema **`net`**, nao em `extensions.net`; o nome de tres partes e lido como
`database.schema.function`. Resultado em producao: o cron `os-webhook-dispatcher-every-minute`
rodaria a cada minuto e falharia com
`ERROR: cross-database references are not implemented`, ou seja, a fila encheria para sempre
sem nenhum erro visivel na aplicacao. Corrigido para `net.http_post(...)` com `body := '{}'::jsonb`
(`body` e `jsonb` no pg_net).

## Evidencia / Acao

Migration aplicada num Postgres 17.11 real (container local com `pg_net` + `pg_cron`):

- Schema criado com sucesso: 7 funcoes, 1 trigger, RLS ligada, 1 cron job.
- Fila ponta a ponta - **11/11** cenarios: `os.created`; `os.updated` so na mudanca de conteudo;
  `os.status_changed` com `previous_status` e status atual; update no-op nao enfileira;
  soft delete -> `os.deleted`; coalescing por `(os_id, event)`; dequeue com `attempts` +
  backoff; `SET ROLE anon` -> `permission denied for function dequeue_os_webhooks`;
  `mark_delivered`; DELETE fisico enfileira `os.deleted` com `os_number` do OLD; reenqueue
  preservando `attempts`.
- Cron dispatcher - **4/4**: sem config -> `{"ok":true,"skipped":"cron not configured"}` (nao
  quebra); com config -> `{"ok":true,"url":".../os-webhook-dispatcher","request_id":1}`;
  1 request efetivamente registrada em `net.http_request_queue`; config resetada.
- `deno test` do dispatcher: 7/7.
- Confirmado em producao que a migration NAO esta aplicada: `POST /rest/v1/rpc/run_os_webhook_dispatcher`
  e `/rest/v1/rpc/dequeue_os_webhooks` retornam `PGRST202` / HTTP 404.

## O que falta para fechar (depende do dono)

1. Aplicar `supabase/migrations/20261121095000_os_erp_webhooks.sql` no projeto
   `fygxlswpkjtjpcefjfty` (nao ha credencial de escrita neste ambiente).
2. Setar os secrets da edge `os-webhook-dispatcher`: `ERP_WEBHOOK_URL`, `ERP_WEBHOOK_SECRET`,
   `CRON_SECRET`.
3. `ALTER DATABASE postgres SET app.net.functions_base = 'https://<ref>.supabase.co/functions/v1'`
   e `app.net.os_webhook_cron_secret = '<CRON_SECRET>'` - sem isso o cron retorna `skipped`.
