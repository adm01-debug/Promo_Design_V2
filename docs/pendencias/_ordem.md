# Ordem de Execucao do Backlog

Prioridade por impacto no negocio e dependencia, validada no baseline 246e410c.

## Bloqueios do dono (nao sao BR)

- [DONO] Rotacionar service_role + reset senha postgres (Dashboard fygxlswpkjtjpcefjfty) - item 19 prod-readiness.
- [DONO] Deletar edge function migrate-helper no Dashboard - responde HTTP 401 hoje.
- [DONO] Aplicar `supabase/migrations/20261121095000_os_erp_webhooks.sql` (PND-10). Sem isso a
  fila `os_webhook_queue` nao existe em producao: `rpc/run_os_webhook_dispatcher` e
  `rpc/dequeue_os_webhooks` retornam PGRST202/404 (verificado 2026-11-21).
- [DONO] Secrets da edge `os-webhook-dispatcher`: `ERP_WEBHOOK_URL`, `ERP_WEBHOOK_SECRET`,
  `CRON_SECRET` + `app.net.functions_base` / `app.net.os_webhook_cron_secret` no database.

## Estado real (revalidado 2026-11-21 no head f7ceafb4)

PND-01..08: DONE (verificados na fonte, docs fechados com evidencia).

1. **PND-09 offline mode - DONE** (PR #75). Service worker real com fallback de navegacao e
   cache de assets; dados do Supabase nunca cacheados. 741/741 vitest, 4/4 e2e em build de
   producao, 16/16 na simulacao do `sw.js`.
2. **PND-10 webhooks ERP - codigo DONE, runtime bloqueado.** Migration + edge function +
   trigger + cron completos e validados em Postgres 17 real (11/11 na fila, 4/4 no cron).
   Bug P0 do `extensions.net.http_post` corrigido (PR #76). Falta aplicar a migration e setar
   os secrets (bloqueios do dono acima).

## Iteracao contabilizada

PND-01..10 criados em 2026-11-21 a partir das 3 auditorias (docs/enterprise-audit-report.md,
docs/senior-frontend-audit.md, docs/senior-backend-audit-2026-07.md) + prod-readiness.
