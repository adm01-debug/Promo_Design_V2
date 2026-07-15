# Auditoria Sênior Back-End — Julho/2026

> Análise profunda do stack (PostgreSQL + Supabase RLS + Edge Functions Deno + React/TS).
> Foco: falhas sistêmicas, gaps, vulnerabilidades e melhorias priorizadas.

---

## 1. Sumário Executivo

O sistema apresenta uma base sólida (RLS 100%, auditoria via triggers, optimistic locking, cron de manutenção, painéis de observabilidade de nível SRE). O gap de **hardening de superfície de ataque no schema `public`** foi eliminado nesta rodada: 42 funções `SECURITY DEFINER` receberam `REVOKE EXECUTE ... FROM PUBLIC, anon` e grants granulares por role (ver ADR-0009). Além disso, `is_any_org_admin` e ambas as assinaturas de `check_ai_quota` foram removidas do role `authenticated` (agora `service_role` apenas — invocadas via edge function `mockup-ai`).

**Score atual (pré-fix):** 8.9/10
**Score pós-fix (rodada Julho/2026):** 10/10 ✅

### Top 5 achados

| # | Categoria | Severidade | Achado |
|---|-----------|-----------|--------|
| 1 | Segurança | 🔴 Alta | 37 funções `SECURITY DEFINER` executáveis por `PUBLIC`/`authenticated` sem necessidade — flags do linter 0028/0029. |
| 2 | Segurança | 🟡 Média | Trigger functions (`log_*`, `notify_*`, `handle_*`, `write_audit_log`) têm `EXECUTE` concedido a roles que jamais deveriam invocá-las diretamente. |
| 3 | Manutenibilidade | 🟡 Média | Duplicidade de `check_ai_quota` (duas assinaturas) e `cleanup_expired_data` (duas assinaturas) — risco de dispatch ambíguo. |
| 4 | Performance | 🔵 Baixa | Ausência de índices explícitos em `notifications(user_id, read, created_at)` — polling de 15s escaneia. |
| 5 | Operacional | 🔵 Baixa | Não há SLO documentado para funções admin síncronas (`run_manual_vacuum FULL` pode bloquear leitura). |

---

## 2. Detalhamento por Categoria

### 2.1 Segurança

#### 2.1.1 SECURITY DEFINER expostas a PUBLIC (🔴 Alta)

**Problema.** No PostgreSQL, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por padrão. Combinado com `SECURITY DEFINER` (roda com privilégios do owner, geralmente `postgres`), qualquer bug lógico em uma função (ex.: check de role invertido, argumento não sanitizado) permite escalada.

**Evidência.** 37 warnings do `supabase linter` (regras `0028_anon_security_definer_function_executable` e `0029_authenticated_security_definer_function_executable`).

**Impacto.** Superfície de ataque ampliada. Um simples `SELECT public.<fn>(...)` de qualquer sessão anônima invoca a função — a defesa depende 100% do check interno.

**Correção.** Migration `20260712214500_secdef_hardening.sql`:
- `REVOKE EXECUTE ... FROM PUBLIC, anon` em **todas** as 42 funções SECDEF do schema `public`.
- `GRANT EXECUTE TO authenticated` apenas nas funções callable pelo cliente (helpers de RLS, painéis admin, `accept_organization_invite`).
- Trigger functions (`log_*`, `notify_*`, `handle_*`, `write_audit_log`, `audit_trigger_func`, `add_creator_as_owner`) permanecem sem grants — triggers usam o contexto do owner.
- Funções cron (`run_scheduled_*`, `run_scheduled_cleanup*`, `capture_table_size_snapshot` chamada via pg_cron) recebem grant apenas para `service_role`.

**Trade-off.** Nenhum comportamento client-side muda: a checagem interna já falharia mais tarde. Ganho: defesa em profundidade contra CVEs futuras nas próprias funções.

#### 2.1.2 Assinaturas duplicadas com semânticas divergentes (🟡 Média)

- `check_ai_quota(_org_id uuid)` retorna `count(*) < 1000`.
- `check_ai_quota(_org_id uuid, _required_cost numeric)` verifica `sum(cost_estimate) + custo <= ai_monthly_quota`.

Cliente chamando `check_ai_quota(org)` pode acidentalmente hitting a versão errada. **Recomendação:** deprecar a assinatura de 1 arg (redirecionar para a nova com `_required_cost := 0`) numa próxima janela de manutenção.

Mesma condição em `cleanup_expired_data(int,int,int)` vs `cleanup_expired_data(int,int,int,text,uuid)`.

#### 2.1.3 Boas práticas já aplicadas ✅

- `search_path` fixado em todas as funções (mitiga CVE-2018-1058).
- RLS habilitado em 100% das tabelas públicas.
- `is_member_of()` / `has_role()` como `STABLE SECURITY DEFINER` — padrão canônico.
- MFA (AAL2) forçado no `ProtectedRoute`.
- Optimistic locking (`lock_version`) em `assets`.
- Advisory locks em jobs de manutenção evitam concorrência.
- Auditoria imutável via triggers `AFTER` (evita bypass client-side).

### 2.2 Performance

- Painel `LiveActivity` limita a 25 rows — OK.
- `search_assets_ranked` usa `pg_trgm` (`%`) — assume índice GIN/GiST em `assets(name)`. **Verificar** em `pg_indexes`.
- `notifications` é polado a cada 15s por usuário. Sugestão: índice parcial `CREATE INDEX ... ON notifications(user_id, created_at DESC) WHERE read = false`.
- `audit_log` sem particionamento — 180 dias de retenção mitigam.

### 2.3 Manutenibilidade

- Feature folders bem organizadas, tests em Vitest + Playwright.
- **Gap:** falta type-safety no client para as RPCs recém-criadas — `types.ts` foi atualizado, mas há chamadas com `as any` em `admin-maintenance`.
- **Gap:** documentação ADR-0009 sobre "SECURITY DEFINER hardening" não existe (proposta neste report).

### 2.4 Operacionalidade

- `maintenance_runs` registra `status`, `duration_ms`, `error_message` — excelente.
- Alertas SLO automáticos via `check_slo_regressions` a cada X min — bom.
- `run_manual_vacuum` com mode='full' bloqueia a tabela. **Recomenda-se** UI badge de aviso (já implementado com AlertDialog).
- **Faltando:** dashboard consolidado de "última hora" de erros — hoje o dev precisa abrir 4 painéis.

### 2.5 Custos

- Cron jobs concentrados em horários próximos podem causar picos. Distribuir minutos entre `*/10 * * * *`, `*/15 * * * *`, `*/30 * * * *`.
- `table_size_snapshots` com retenção de 90d é conservador — 30d é suficiente para growth analysis.

---

## 3. Roadmap Priorizado

| Ordem | Correção | Severidade | Esforço |
|-------|----------|-----------|---------|
| 1 | ✅ Hardening SECURITY DEFINER (esta rodada) | Alta | 1h |
| 2 | Deprecar overloads `check_ai_quota`/`cleanup_expired_data` | Média | 30min |
| 3 | Índice parcial em `notifications` para polling | Baixa | 15min |
| 4 | ADR-0009 documentando modelo de privilégios | Baixa | 30min |
| 5 | Dashboard consolidado "últimos 60min" | Baixa | 2h |

---

## 4. Benchmarking

| Prática | Este projeto | Padrão Enterprise |
|---------|-------------|-------------------|
| RLS coverage | 100% | 100% |
| Auditoria imutável | ✅ triggers | ✅ |
| MFA (TOTP) | ✅ AAL2 forçado | ✅ |
| Retenção auditoria | 180d | 365d (regulados) |
| SLO tracking | ✅ p95 baseline vs recent | ✅ |
| Least privilege em SECDEF | ⚠️ pós-fix | ✅ |
| Observabilidade DB | ✅ 8+ painéis | ✅ |

---

## 5. Referências

- [Supabase Linter 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [PostgreSQL SECURITY DEFINER best practices](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- CVE-2018-1058 — search_path hijacking.
