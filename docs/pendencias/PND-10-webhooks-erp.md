---
ID: PND-10
Titulo: Webhooks de saida para OS concluidas (ERP)
Estado: DONE - INFRA COMPLETA EM PRODUCAO; MODO SELF-DISABLE POR AUSENCIA DOS SECRETS ERP
Fonte: docs/enterprise-audit-report.md [lacuna]
Data: 2026-11-21
---

# PND-10 - Webhooks de saida para OS concluidas (ERP)

## Estado

**DONE em producao (verificado por query real em 2026-11-22 18:06 UTC).**

O que esta ativo no projeto `fygxlswpkjtjpcefjfty`:

- Migration `20261121095000_os_erp_webhooks.sql` aplicada: tabela `os_webhook_queue` existe,
  as 3 funcoes (`enqueue_os_webhook`, `run_os_webhook_dispatcher`, `dequeue_os_webhooks`)
  existem.
- Trigger `trg_os_webhook_enqueue` ativo em `service_orders` cobrindo **INSERT, UPDATE e
  DELETE** (todos os eventos de OS, conforme decisao de negocio).
- Cron `os-webhook-dispatcher-every-minute` (`* * * * *`, active=true) executando
  `run_os_webhook_dispatcher()`.
- Config lida do **Vault** (`os_webhook_functions_base` + `os_webhook_cron_secret`), nao de
  GUC `app.net.*` - o role `postgres` nao e superuser em Supabase hospedado.
- Dispatcher **vivo**: 245 requisicoes HTTP 200 registradas em `net._http_response`; 60 na
  ultima hora; ultima em 2026-11-22 18:06:00 UTC.

O unico item aberto **depende do dono** e nao esta no repositorio: os secrets
`ERP_WEBHOOK_URL` e `ERP_WEBHOOK_SECRET` nao existem nos secrets da Edge Function (checado
via Management API). Sem eles o dispatcher responde `{"ok":true,"disabled":true,"delivered":0}`
a cada minuto - ou seja, roda, consome o cron e nao entrega. Assim que os dois secrets forem
criados, a fila passa a drenar sem mudanca de codigo nem de banco.

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

1. ~~Aplicar a migration~~ - **FEITO**, aplicada e registrada em
   `supabase_migrations.schema_migrations`.
2. ~~Configurar a base e o segredo do cron~~ - **FEITO** via Vault
   (`os_webhook_functions_base`, `os_webhook_cron_secret`). `CRON_SECRET` ja existe nos
   secrets da Edge Function.
3. **ABERTO - unico item:** criar `ERP_WEBHOOK_URL` e `ERP_WEBHOOK_SECRET` nos secrets da
   Edge Function. Sem eles o dispatcher fica em self-disable (`disabled:true`).
