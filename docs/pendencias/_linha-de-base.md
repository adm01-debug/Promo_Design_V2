# Linha de Base - Promo Design V2

> Baseline registrado em 2026-11-21 com o proposito do GOAL: zero regressao e zero perda de trabalho de agentes de IA. Qualquer mudanca futura deve ser validada contra esta foto.

## Sistema

- Repo: ad01-debug/Promo_Design_V2 - SPA React 18 + Vite + Shadcn UI + TanStack Query + Supabase (PostgreSQL + RLS + Auth MFA + Edge Functions Deno) + Vercel.
- Head do main neste baseline: `fa7e0f42` (CI 11/11 green, run 44948436765). Baseline anterior: `246e410c` (run 44901004005).
- Project ref Supabase: fygxlswpkjtjpcefjfty.

## Inventario de rotas (src/App.tsx)

/auth, /reset-password, / (Dashboard), /mockup/new|drafts|history|editor|templates|compare|service-order|service-orders|service-dashboard, /catalog, /clients, /clients/:clientId/brand, /clients/:clientId/brand/history, /magicup/generate|prompts|history|favorites|jobs|styles, /video/new|moodboard|photodump|gallery|cinema|inspiration|characters|history, /settings, /templates, /organization, /dam, /dam/collections, /dam/preview, /dam/trash, /dashboard/analytics, /dashboard/widgets, /audit, /audit/event/:eventId, /docs, /brand/public/:token, /mockup/approve/:token; fallback NotFound.

## Inventario de Edge Functions (supabase/functions)

11 funcoes: mockup-ai, asset-ocr, video-generate, cleanup-expired-data, admin-maintenance, brand-guidelines-infer, migrate-helper, migrate-push, mockup-approval, brand-share, magic-up-jobs, os-webhook-dispatcher (+ _shared/). **Deployadas em producao:** mockup-ai, asset-ocr, video-generate, cleanup-expired-data, admin-maintenance, brand-guidelines-infer, migrate-helper (todas HTTP 401 sem JWT = protegidas). **Nao deployadas (HTTP 404):** mockup-approval, brand-share, magic-up-jobs, os-webhook-dispatcher.

## Inventario do banco (supabase/migrations, 148 arquivos)

25+1 tabelas publicas: ai_usage_log, assets, audit_alert_rules, audit_log (+ _default particao), audit_saved_views, brand_guidelines, brand_guidelines_infer_history, catalog_products, client_contacts, client_design_patterns, clients, dam_saved_searches, magicup_history, maintenance_runs, mockup_drafts, notifications, organization_invites, organization_members, organizations, product_categories, service_orders, status_audit_log, table_size_snapshots, videos. RLS 100%, auditoria imutavel via triggers, optimistic locking em assets (ADR-0004).

**Migrations no repo ainda nao aplicadas em producao** (7): `20261121095000_os_erp_webhooks` (fila `os_webhook_queue`), `20261121110000_approval_tokens`, `20261121114500_brand_guidelines_history`, `20261121115000_brand_share_tokens`, `20261121120000_dam_collections`, `20261121123500_magic_up_styles`, `20261121200000_magic_up_jobs`. Verificado 2026-11-22 via PostgREST: as 8 tabelas retornam `PGRST205`. Validacao das 6 novas em Postgres 17 limpo: `ALL_MIGRATIONS_OK` (7 tabelas com RLS, 16 policies `TO authenticated`, RPCs `cancel_magic_up_job` e `count_collection_assets` com `SECURITY DEFINER`).

## Qualidade no baseline (head `fa7e0f42`)

| Verificacao                        | Resultado      | Evidencia                                                                                                                                                   |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typecheck                          | pass           | tsc -b exit 0                                                                                                                                               |
| lint ESLint                        | pass           | eslint . --quiet exit 0                                                                                                                                     |
| prettier check (src + docs + raiz) | pass           | CI job Format (Prettier) success                                                                                                                            |
| vitest                             | pass           | vitest run: 47 files, 752/752 tests pass (2026-11-22)                                                                                                       |
| Deno (edge functions)              | pass           | 70/70 testes (inclui 13 nos dois endpoints publicos)                                                                                                        |
| CI no main                         | pass           | run 44948436765 head fa7e0f42: 11/11 jobs success (Install, Edge, Format, Lint, Tests, Build, Typecheck, Quality Gate, Generate audit PDF, E2E, Load tests) |
| Producao                           | deploy success | smoke HTTP 200 em /, /dam/collections, /magicup/jobs, /magicup/styles, /brand/public/:token, /mockup/approve/:token (https://promo-design-v2.vercel.app)    |

## Regressoes conhecidas (baseline)

1. migrate-helper ainda deployada em producao (HTTP 401) - codigo ja usa env var (MIGRATE_HELPER_ACCESS_KEY), ACCESS_KEY vazada rejeitada em runtime. Remocao exige Dashboard.
2. Itens BLOQUEADOS em prod-readiness #12 (advisor sem ERROR - depende de acesso admin) e #19 (scan/segredos - aguarda rotacao no Dashboard).
3. **`verify_jwt = false`** declarado em `supabase/config.toml` para `mockup-approval` e `brand-share` (links publicos por token) - sem efeito ate as functions serem deployadas.
4. 7 migrations do repo nao aplicadas em producao: as features backend (aprovacao cliente, colecoes DAM, brand history, brand share, Magic Up jobs/styles, webhooks ERP) estao **completas em codigo e validadas em Postgres 17**, mas retornam erro de tabela inexistente ate a aplicacao.

## Inventario de branches (22/11)

Todas as branches `claude/*` verificadas byte-a-byte e encerradas. As 6 branches do backlog (#69-#74) foram incorporadas em `main` via #78 (squash `fa7e0f42`); verificacao: todos os 67 arquivos existem em `main` e nao ha linha de feature perdida. PRs fechadas sem merge para evitar duplicacao de commit. Nenhum trabalho de agente pendente ou perdido.
