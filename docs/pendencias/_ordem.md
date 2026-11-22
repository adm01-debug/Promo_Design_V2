# Ordem de Execucao do Backlog

Prioridade por impacto no negocio e dependencia, validada no baseline 246e410c.

## Bloqueios do dono (nao sao BR)

- [DONO] Aplicar as 7 migrations pendentes no projeto `fygxlswpkjtjpcefjfty`: `20261121095000_os_erp_webhooks`
  (PND-10) e as 6 do backlog (`approval_tokens`, `brand_guidelines_history`, `brand_share_tokens`,
  `dam_collections`, `magic_up_styles`, `magic_up_jobs`). Sem isso as 8 tabelas nao existem em producao
  (`PGRST205` verificado 2026-11-22) e as features novas respondem erro de tabela inexistente.
- [DONO] Deploy das edges `magic-up-jobs` e `os-webhook-dispatcher` (HTTP 404, verificadas em
  2026-11-22). `mockup-approval` e `brand-share` **ja estao deployadas** — respondem HTTP 400 a um
  POST `{}`, que e o validador de body rejeitando payload invalido, nao rota ausente.
- [DONO] Rotacionar service_role + reset senha postgres (Dashboard fygxlswpkjtjpcefjfty) - item 19 prod-readiness.
- [DONO] Deletar edge function migrate-helper no Dashboard - responde HTTP 401 hoje.
- [DONO] Secrets da edge `os-webhook-dispatcher`: `ERP_WEBHOOK_URL`, `ERP_WEBHOOK_SECRET`,
  `CRON_SECRET` + `app.net.functions_base` / `app.net.os_webhook_cron_secret` no database.
- [DONO] Aplicar a migration `20261122150000_cron_retencao_dados.sql` (PR #102). Retencao de
  dados nunca rodou em producao: `public.run_scheduled_cleanup_per_org()` existe desde
  `20260712194748` (SECURITY DEFINER, `GRANT ... TO service_role`) mas **nenhuma** das 155
  migrations fazia `cron.schedule` para ela, e a edge `cleanup-expired-data` nao tem chamador
  (`rg "cleanup-expired-data" src` = 0). Efeito: `audit_log`, `notifications` e `status_audit`
  crescem indefinidamente, sem aplicar as retencoes por organizacao (180/90/365 dias). Os 8 jobs
  agendados hoje sao todos de monitoramento.

## Estado real (revalidado 2026-11-22 no head fa7e0f42)

PND-01..08: DONE (verificados na fonte, docs fechados com evidencia).

1. **PND-09 offline mode - DONE** (PR #75). Service worker real com fallback de navegacao e
   cache de assets; dados do Supabase nunca cacheados. 752/752 vitest, 4/4 e2e em build de
   producao, 16/16 na simulacao do `sw.js`.
2. **PND-10 webhooks ERP - codigo DONE, runtime bloqueado.** Migration + edge function +
   trigger + cron completos e validados em Postgres 17 real (11/11 na fila, 4/4 no cron).
   Bug P0 do `extensions.net.http_post` corrigido (PR #76). Falta aplicar a migration e setar
   os secrets (bloqueios do dono acima).
3. **Backlog do FEATURES.md (12 itens) - DONE em codigo e CI** (PR #78, `fa7e0f42`). Nenhum
   item 🔴, 🟡 ou 🔵 restante no doc. Aprovacao de cliente, colecoes DAM, brand history,
   brand share, Magic Up jobs e Magic Up styles: hooks, paginas, rotas, sidebar, command
   palette, edge functions e migrations completos. 2 bugs corrigidos na consolidacao:
   `verify_jwt` das functions publicas e erro engolido (estado vazio mascarando falha) em 3 telas.
   Runtime bloqueado pela aplicacao das migrations (bloqueio do dono acima).

## Iteracao contabilizada

PND-01..10 criados em 2026-11-21 a partir das 3 auditorias (docs/enterprise-audit-report.md,
docs/senior-frontend-audit.md, docs/senior-backend-audit-2026-07.md) + prod-readiness.
