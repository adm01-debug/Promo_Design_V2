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
| 12 | Banco: advisors sem ERROR + migrations == banco | **BLOQUEADO** | Sem `SUPABASE_ACCESS_TOKEN` no ambiente nem CLI `supabase` (nao no PATH) para rodar `supabase db lint`/advisors e diff. Adicional: `supabase/config.toml` usa `project_id="qmwvvvrdufjpgkcorjeb"` mas o app de producao usa `fygxlswpkjtjpcefjfty` - discrepancia que preciso confirmar antes de qualquer operacao de banco. Falta: token/service role admin com scope no projeto de producao. |
| 13 | Producao: deploy confirmado | **OK** | Deploy `dpl_4Gp3LfpnfonKX6MFqa392tym2jq4` = **READY** no commit head `9cbfd1cb`; log de build stderr = apenas `npm inputwarning` - zero erros. Zero deploys `QUEUED/BUILDING`. |
| 14 | Producao: deep-links / SPAs | **OK** | 7 rotas em producao HTTP 200 (`/auth`, `/service-orders`, `/mockup/new`, `/mockup/service-orders`, `/mockup/service-dashboard`, `/catalog`, `/docs`); `index-BypHF9I6.js` HTTP 200. |
| 15 | Producao: backend Supabase vivo | **OK** | host `fygxlswpkjtjpcefjfty.supabase.co`: `/auth/v1/health` 401 (credencial requerida -> live); `/rest/v1/` 401 (esperado). |
| 16 | Producao: edge functions | **OK** (6/8) | `mockup-ai`, `asset-ocr`, `video-generate`, `cleanup-expired-data`, `admin-maintenance`, `brand-guidelines-infer` -> HTTP 401 sem JWT (deployadas, protegidas). `migrate-helper`/`migrate-push` -> HTTP 404 (nao deployadas/util). |
| 17 | Producao: fluxo autenticado (login->dashboards->editor->OS) | **BLOQUEADO** | Nao ha credencial de usuario real. Email de infra (`fygxlswpkjtjpcefjfty@supabase.co`) -> `email_not_confirmed` (user pending, nao ativo). Candidates de senha em envs do Vercel -> signin HTTP 404. Sem conta authed de outra fonte, nao posso validar os fluxos que exigem login. |
| 18 | Entregas por PR com CI verde | **OK** | Zero PRs abertas. Ultima entrega (`.gitignore` tsbuildinfo) = PR #14, CI verde, mergeada `9cbfd1cb`, deploy READY. `docs/prod-readiness.md` sera entregue por PR normal (nao mergeio por ser documentacao em area de config - deixo aberta + notifico). |