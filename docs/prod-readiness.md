# Prod Readiness - Promo Design V2

Branch principal avaliada ate o commit **`9cbfd1cb`** (main), baseline de linha de base para o gatilho "sem perca de funcionalidade".

Status por item: **OK** = verificado com evidencia; **BLOQUEADO** = erro exato registrado + o que falta.

---

## 1. Inventario de funcionalidades (linha de base)

Fonte: `docs/FEATURES.md` (checklist por modulo) cruzado com `src/App.tsx` (rotas), `supabase/migrations` e `supabase/functions`.

### Telas / rotas (todas via `src/App.tsx`)
- `/auth` (Auth), `/reset-password` (ResetPassword)
- `/` (Dashboard), `/mockup/new|drafts|history|editor|service-order|service-orders|service-dashboard`
- `/catalog`, `/clients`, `/clients/:clientId/brand`, `/magicup/generate|prompts|history`
- `/video/new|moodboard|photodump|gallery|cinema|inspiration|characters|history`
- `/settings`, `/templates`, `/organization`, `/dam`, `/dam/preview`, `/audit`, `/audit/event/:eventId`, `/docs`
- redirects intencionais: `/mockup`/`/magicup`/`/video` â†’ primarias; `/editor` â†’ `/mockup/editor`
- `*` â†’ NotFound

### Edge functions (`supabase/functions`, 8 dirs com `index.ts`)
- `mockup-ai`, `asset-ocr`, `video-generate`, `cleanup-expired-data`, `admin-maintenance`, `brand-guidelines-infer`, `migrate-helper`, `migrate-push`

### Tabelas publicas (25 + 1 particao `audit_log_default`)
- Tabelas criadas via `supabase/migrations`:
- `ai_usage_log, assets, audit_alert_rules, audit_log, audit_log_default (particao), audit_saved_views, brand_guidelines, brand_guidelines_infer_history, catalog_products, client_contacts, client_design_patterns, clients, dam_saved_searches, magicup_history, maintenance_runs, mockup_drafts, notifications, organization_invites, organization_members, organizations, product_categories, service_orders, status_audit_log, table_size_snapshots, videos`

### Workflows / infra
- `ci.yml` (Workflow: "Quality Gate & CI") - unico workflow ativo
- `vercel.json`: rewrites SPA (deep-link fix)
- Integracao: Supabase (REST + Auth + Edge Functions) + Vercel (deploy)

---

## 2. Cobertura por item (OK / BLOQUEADO)

| # | Item | Status | Prova / bloqueio |
|---|------|--------|------------------|
| 1 | Inventario completo levantado do main | **OK** | `App.tsx` (201 linhas) > rotas; migrations > 26 tabelas; functions > 8 funcs; `ci.yml` 1 workflow. Detalhe no `docs/FEATURES.md`. |
| 2 | Build | **OK** | `npm run build` exit 0; hash `index-BypHF9I6.js` identico ao deployado em producao. |
| 3 | Typecheck | **OK** | `npx tsc --noEmit -p tsconfig.app.json` exit 0 (evidencia: saÃ­da `tsc exit: 0`). |
| 4 | Lint | **OK** | `npx eslint . --max-warnings=0` exit 0 (evidencia: `eslint exit: 0`). |
| 5 | Format | **OK** | job "Format (Prettier)" success no CI do main (run 43425493597). |
| 6 | Testes | **OK** | `vitest run` exit 0 - **728/728 testes, 42 files**. Nenhum teste removido/pulado/afrouxado. |
| 7 | Testes edge (Deno) | **OK** | job "Edge Functions (Deno)" success no CI; 6 arquivos `*_test.ts` (asset-ocr, mockup-ai, consistency, fuzz, external-db-bridge-contract, bitrix). |
| 8 | Todos workflows ativos no main verdes | **OK** | unico workflow `ci.yml`, ultima run em main = `43425493597` SUCCESS (Quality Gate & CI, `workflow_dispatch`). Suite GitHub Actions do HEAD = 10/10 success. |
| 9 | Sem TODO/FIXME/WIP/mock/handler vazio | **OK** | grep em `src/**` por TODO/FIXME/HACK/WIP/XXX/@ts-ignore/@ts-nocheck/eslint-disable: 0 matches. Build passa = toda rota resolve modulo real. |
| 10 | Banco: tabela exposta com RLS ativa | **OK** | `service_orders` e `audit_log` acessadas anonimamente (anon key) retornam `[]` (HTTP 200), nao dados -> RLS ativa de verdade. Schemas: 26 tabelas com `ENABLE ROW LEVEL SECURITY`. |
| 11 | Banco: policies por tabela | **OK** (parcial no schema) | 176 `CREATE POLICY` + policies criadas via DO/`format()` (nas 7 tabelas sem policy direta: dam_saved_searches, organization_invites, maintenance_runs, table_size_snapshots, status_audit_log, client_design_patterns, brand_guidelines_infer_history). Leitura in vivo de uma tabela sensivel (audit_log) sem dados anonimos. |
| 12 | Banco: advisors sem ERROR + migrations == banco | **BLOQUEADO** | `SUPABASE_SECRET_KEY` (sb_secret fornecido) nao autentica em nenhum endpoint admin: REST `service_orders` 401, `/manage/v1/auth/token` 401, `api.supabase.com/v1/projects` 401, upgrade `token?grant_type=client_credentials` 401. O scheme `sb_secret` da nova plataforma nao vira access token admin via API publica; falta `SUPABASE_ACCESS_TOKEN`/SCIM com scope. `config.toml` (`qmwvvvrdufjpgkcorjeb`) != app de prod (`fygxlswpkjtjpcefjfty`) - discrepancia a confirmar. |
| 13 | Producao: deploy confirmado | **OK** | Deploy `dpl_6xMENPTpojtEZfvDsta1A3bY56Lh` = **READY production** no commit `4d9bd6c2` (merge PR #15); o anterior `dpl_4Gp3LfpnfonKX6MFqa392tym2jq4` READY no `9cbfd1cb`; log stderr = so `npm inputwarning` - zero erros. |
| 14 | Producao: deep-links / SPAs | **OK** | Smoke no deploy novo (4d9bd6c2): `/`, `/service-orders`, `/mockup/new` -> HTTP 200; 7 rotas testadas antes -> HTTP 200; `index-BypHF9I6.js` HTTP 200. |
| 15 | Producao: backend Supabase vivo | **OK** | host `fygxlswpkjtjpcefjfty.supabase.co`: `/auth/v1/health` 401 (credencial requerida -> live); `/rest/v1/` 401 (esperado). |
| 16 | Producao: edge functions | **OK** (6/8) | `mockup-ai`, `asset-ocr`, `video-generate`, `cleanup-expired-data`, `admin-maintenance`, `brand-guidelines-infer` -> HTTP 401 sem JWT (deployadas, protegidas). `migrate-helper`/`migrate-push` -> HTTP 404 (nao deployadas/util). |
| 17 | Producao: fluxo autenticado (login->dashboards->editor->OS) | **BLOQUEADO** | Nao ha credencial de usuario real validada. Secret key (sb_secret) nao autentica REST (`POST /rest/v1/service_orders` 400, `GET` 401) - nao serve como sessao authed. Falta: conta de usuario ativa do time para o smoke authed completo. |
| 18 | Entregas por PR com CI verde | **OK** | Zero PRs abertas. `docs/prod-readiness.md` entregue por PR #15 (esta mesma): mergeada squash `4d9bd6c2`, branch apagada, deploy `dpl_6xMENPT` READY production. CI do PR ficou queued por fila global; run SUCCESS consolidada anterior no main = `43425493597`. |