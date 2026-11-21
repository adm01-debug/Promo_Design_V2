# Linha de Base - Promo Design V2

> Baseline registrado em 2026-11-21 com o proposito do GOAL: zero regressao e zero perda de trabalho de agentes de IA. Qualquer mudanca futura deve ser validada contra esta foto.

## Sistema

- Repo: ad01-debug/Promo_Design_V2 - SPA React 18 + Vite + Shadcn UI + TanStack Query + Supabase (PostgreSQL + RLS + Auth MFA + Edge Functions Deno) + Vercel.
- Head do main neste baseline: 246e410c (CI 11/11 green, run 44901004005).
- Project ref Supabase: fygxlswpkjtjpcefjfty.

## Inventario de rotas (src/App.tsx)

/auth, /reset-password, / (Dashboard), /mockup/new|drafts|history|editor|templates|compare|service-order|service-orders|service-dashboard, /catalog, /clients, /clients/:clientId/brand, /magicup/generate|prompts|history|favorites, /video/new|moodboard|photodump|gallery|cinema|inspiration|characters|history, /settings, /templates, /organization, /dam, /dam/preview, /dam/trash, /dashboard/analytics, /dashboard/widgets, /audit, /audit/event/:eventId, /docs; fallback NotFound.

## Inventario de Edge Functions (supabase/functions)

8 funcoes: mockup-ai, asset-ocr, video-generate, cleanup-expired-data, admin-maintenance, brand-guidelines-infer, migrate-helper, migrate-push (+ _shared/). Prova HTTP em producao (HTTP 401 sem JWT = deployada e protegida): mockup-ai, asset-ocr, video-generate, cleanup-expired-data, admin-maintenance, brand-guidelines-infer. migrate-helper responde HTTP 401 (deployada, ativa no runtime).

## Inventario do banco (supabase/migrations, 148 arquivos)

25+1 tabelas publicas: ai_usage_log, assets, audit_alert_rules, audit_log (+ _default particao), audit_saved_views, brand_guidelines, brand_guidelines_infer_history, catalog_products, client_contacts, client_design_patterns, clients, dam_saved_searches, magicup_history, maintenance_runs, mockup_drafts, notifications, organization_invites, organization_members, organizations, product_categories, service_orders, status_audit_log, table_size_snapshots, videos. RLS 100%, auditoria imutavel via triggers, optimistic locking em assets (ADR-0004).

## Qualidade no baseline (head 246e410c)

| Verificacao                        | Resultado      | Evidencia                                                                                                                                                   |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typecheck                          | pass           | tsc --noEmit exit 0                                                                                                                                         |
| lint ESLint                        | pass           | eslint . exit 0                                                                                                                                             |
| prettier check (src + docs + raiz) | pass           | prettier --check exit 0                                                                                                                                     |
| vitest                             | pass           | vitest run: 42 files, 728/728 tests pass (2026-11-21)                                                                                                       |
| CI no main                         | pass           | run 44901004005 head cda35d4e: 11/11 jobs success (Install, Edge, Format, Lint, Tests, Build, Typecheck, Quality Gate, Generate audit PDF, E2E, Load tests) |
| Producao                           | deploy success | deployment "Production - promo-design-v2" head 246e410c; smoke HTTP 200 em https://promo-design-v2.vercel.app                                               |

## Regressoes conhecidas (baseline, pre GOAL)

1. migrate-helper ainda deployada em producao (HTTP 401) - prevista para remocao; codigo ja usa env var (MIGRATE_HELPER_ACCESS_KEY), ACCESS_KEY vazada rejeitada em runtime.
2. Itens BLOQUEADOS em prod-readiness #12 (advisor sem ERROR - depende de acesso admin) e #19 (scan/segredos - parcial, aguarda rotacao no Dashboard).
3. Funcoes migrate-push e migrate-helper configuradas localmente em stages antigos; config.toml atual nao declara [functions.*] (deploy via Dashboard).

## Inventario de branches (21/11)

Todas as branches claude/* e dependabot do historico foram verificadas (ver docs/prod-readiness.md); majors Dependabot (zod 4, vite 8, vitest, actions) mergidos em 11/20 com CI verde. Sem trabalho de agente pendente ou perdido.
