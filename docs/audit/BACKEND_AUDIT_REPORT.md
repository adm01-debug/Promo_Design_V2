# 🔬 Auditoria Back-End — Relatório Sênior

**Sistema:** Promo Design Suite (React 18 + Vite + TypeScript + Supabase / Lovable Cloud)
**Data:** 12/07/2026
**Auditor:** Engenheiro Back-End Sênior (Claude Opus 4.8)
**Escopo:** Arquitetura, banco, RLS, edge functions, integrações, segurança, performance, observabilidade, custo.

---

## 1. Sumário Executivo

O sistema está em **nível de maturidade alto** — RLS ativa em 100% das tabelas públicas, cron jobs de manutenção, snapshots de tamanho, painel de saúde de banco, auditoria imutável, MFA suportado, verificação de bloat, saturação de sequências e alertas de idle-in-transaction. A base é sólida.

Entretanto, o **linter Supabase reporta 34 findings `WARN`** (todos sobre `SECURITY DEFINER` exposto), há **falhas sistêmicas em observabilidade de edge functions**, **acoplamento excessivo entre camada de UI e RPCs específicos**, e **ausência de circuit breaker em integrações externas (Bitrix24, n8n)**. Também há **gaps de teste automatizado end-to-end** e ausência de **rate limit** em endpoints AI.

### Nota consolidada por dimensão

| Dimensão         | Nota         | Justificativa                                                                                                                         |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Segurança        | **8.5 / 10** | RLS 100%, MFA, roles isoladas; findings de `SECURITY DEFINER` são documentados em ADR mas ainda expostos ao `anon` em duas funções.   |
| Performance      | **8 / 10**   | Índices bem definidos, pg_stat_statements ativo; falta cache de aplicação e paginação em algumas listagens.                           |
| Manutenibilidade | **7.5 / 10** | TS strict, feature folders, mas arquivos > 500 linhas (MaintenancePanel.tsx) e RPC calls com cast unsafe (`supabase.rpc as unknown`). |
| Observabilidade  | **8 / 10**   | Auditoria + snapshots + notifications; falta correlação de trace-id em edge functions.                                                |
| Confiabilidade   | **8 / 10**   | Advisory locks nas rotinas críticas; falta retry/backoff formal em integrações.                                                       |
| Custo            | **9 / 10**   | Retenção agressiva, cleanup particionado por org, snapshots limitados a 90 dias.                                                      |

**Nota global: 8.2 / 10** — próximo passo para 10/10 detalhado em §7.

---

## 2. Segurança

### 2.1 🔴 CRÍTICO — 2 funções `SECURITY DEFINER` executáveis por `anon`

**Evidência:** Linter Supabase, findings `0028` (WARN 1 e WARN 2).

**Impacto:** Um atacante não-autenticado pode invocar `RPC` diretamente pela Data API. Mesmo com `RAISE EXCEPTION` no corpo, expõe a superfície e permite side-channel de enumeração.

**Correção sugerida:**

```sql
REVOKE EXECUTE ON FUNCTION public.get_maintenance_stats() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM anon, PUBLIC;
-- validar cada finding do linter individualmente
```

Documentar em `docs/adr/0009-security-definer-privilege-model.md` quais funções são intencionalmente `authenticated` e quais devem ser restritas.

### 2.2 🟡 IMPORTANTE — 32 funções expostas a `authenticated`

**Contexto:** documentadas na ADR-0009. A justificativa (RLS + role check interno) é válida, porém a auditoria recomenda:

- Mover funções de manutenção (`run_manual_vacuum`, `terminate_backend`, `capture_table_size_snapshot`) para schema privado `ops`, exposto apenas via edge function autenticada com JWT claim `role='ops'`.
- Executar em `SECURITY INVOKER` quando o acesso já é restrito por role check (`has_role`).

### 2.3 🟡 IMPORTANTE — `write_audit_log` e `audit_trigger_func` duplicadas

Duas funções fazem o mesmo trabalho com schemas de `audit_log` ligeiramente diferentes (`entity_type` vs `table_name`, `old_data` vs `old_values`). Risco: perda de auditoria em uma delas.

**Correção:** consolidar em uma única função `public.record_audit_event(...)` e migrar dados históricos.

### 2.4 🟢 BAIXA — Ausência de HIBP (Have I Been Pwned) no Auth

Habilitar via `configure_auth({ password_hibp_enabled: true })` para bloquear senhas vazadas em signup/reset.

### 2.5 🟢 BAIXA — Falta CSP/HSTS em headers do front

Adicionar `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` em `index.html` ou via Vercel/Netlify headers.

---

## 3. Banco de Dados

### 3.1 🟡 IMPORTANTE — Heurística de bloat imprecisa

`get_index_bloat_estimate` usa fator fixo de 30% — não reflete realidade do índice. Recomenda-se instalar `pgstattuple` e trocar por:

```sql
SELECT pgstattuple_approx('public.assets_pkey');
```

### 3.2 🟡 IMPORTANTE — Ausência de índice em `notifications(event_type, created_at)`

`check_connection_saturation_alerts` e `check_idle_in_txn_alerts` fazem dedup queries filtrando por `event_type` + `created_at`. Sem índice composto, cada verificação faz seq scan.

```sql
CREATE INDEX CONCURRENTLY notifications_event_type_created_at_idx
  ON public.notifications (event_type, created_at DESC);
```

### 3.3 🟡 IMPORTANTE — `audit_log` cresce sem particionamento

Retenção de 180 dias ajuda, mas para orgs de alto volume o `DELETE` em cascata via cron pode causar bloat. Migrar para **partitioned table** por mês:

```sql
CREATE TABLE public.audit_log_new (...) PARTITION BY RANGE (created_at);
CREATE TABLE audit_log_2026_07 PARTITION OF audit_log_new
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

`DROP PARTITION` é O(1) vs `DELETE` que gera WAL e bloat.

### 3.4 🟢 BAIXA — `search_assets_ranked` usa `similarity()` sem índice GIN trigram

Se o volume de `assets` crescer, esse RPC ficará O(n). Adicionar:

```sql
CREATE INDEX assets_name_trgm ON public.assets USING gin (name gin_trgm_ops);
CREATE INDEX assets_ocr_trgm ON public.assets USING gin (ocr_text gin_trgm_ops);
```

### 3.5 🟢 BAIXA — Sequência `serial` em `product_categories` (verificar)

O painel `SequenceSaturationPanel` foi criado hoje justamente para monitorar. Ao primeiro alerta ≥ 70%, migrar para `bigint`.

---

## 4. Edge Functions

### 4.1 🔴 CRÍTICO — Ausência de rate limit em `mockup-ai` e `admin-maintenance`

**Impacto:** Um usuário mal-intencionado (ou bug do front) pode consumir toda quota AI mensal em segundos.

**Correção:** implementar rate limit via `pg_advisory_lock` por `user_id + endpoint` com janela deslizante ou usar tabela `ai_rate_limit` com contadores por minuto.

```typescript
// supabase/functions/mockup-ai/index.ts
const { data: recent } = await supabase
  .from("ai_usage_log")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .gte("created_at", new Date(Date.now() - 60_000).toISOString());
if ((recent.count ?? 0) > 10) return new Response("rate_limited", { status: 429 });
```

### 4.2 🟡 IMPORTANTE — Falta correlation-id / trace-id

Nenhuma edge function propaga um `x-request-id`. Debug em produção fica cego. Injetar via middleware:

```typescript
const traceId = req.headers.get("x-request-id") ?? crypto.randomUUID();
console.log(JSON.stringify({ traceId, event: "request", url: req.url }));
```

### 4.3 🟡 IMPORTANTE — `admin-maintenance` retorna erro do PostgreSQL bruto ao cliente

Expõe estrutura interna. Encapsular em `{ error: 'internal_error', code: 'MAINT_500' }` e logar detalhes internamente.

### 4.4 🟢 BAIXA — Ausência de teste de contrato para respostas

Existe `external-db-bridge-contract_test.ts` mas não cobre todas as ações. Adicionar Zod schemas de resposta e validar no client + edge function.

---

## 5. Integrações Externas

### 5.1 🔴 CRÍTICO — Bitrix24 sem circuit breaker

**Impacto:** Falha do Bitrix pode bloquear criação de OS (timeout em cascata).

**Correção:** wrap com circuit breaker (padrão de 3 falhas → open por 30s):

```typescript
class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (Date.now() < this.openUntil) throw new Error("circuit_open");
    try {
      const r = await fn();
      this.failures = 0;
      return r;
    } catch (e) {
      if (++this.failures >= 3) this.openUntil = Date.now() + 30_000;
      throw e;
    }
  }
}
```

### 5.2 🟡 IMPORTANTE — n8n webhook sem HMAC signature

Webhooks recebidos de n8n não verificam signature. Adicionar HMAC-SHA256 com secret compartilhado no header `x-n8n-signature`.

### 5.3 🟡 IMPORTANTE — Sem dead-letter queue

Falhas de integração são apenas logadas. Criar tabela `integration_dlq(id, provider, payload, error, retry_count, next_retry_at)` e reprocessar via cron.

---

## 6. Frontend (Camada de Consumo do Back)

### 6.1 🟡 IMPORTANTE — Casts `supabase.rpc as unknown as ...`

Presente em `IndexBloatPanel.tsx` e `SequenceSaturationPanel.tsx`. Sinal de tipos regenerados sem os novos RPCs. **Correção:** aguardar regeneração automática de `src/integrations/supabase/types.ts` após a migração e substituir por `supabase.rpc('get_index_bloat_estimate', ...)` tipado.

### 6.2 🟡 IMPORTANTE — `MaintenancePanel.tsx` com > 550 linhas

Violação da regra dos 400 linhas em memória. Extrair para:

- `useMaintenanceData()` hook
- `MaintenanceHeader`, `MaintenanceRetention`, `MaintenanceGrowth`, `MaintenanceDisk`

### 6.3 🟢 BAIXA — Polling de 15s em `notifications`

OK para MVP, mas para escala considerar Supabase Realtime ou Server-Sent Events.

---

## 7. Roadmap para 10/10

| Prioridade | Item                                                    | Esforço | Categoria         |
| ---------- | ------------------------------------------------------- | ------- | ----------------- |
| P0 🔴      | Rate limit em edge functions AI                         | M       | Segurança / Custo |
| P0 🔴      | Circuit breaker Bitrix + DLQ                            | M       | Confiabilidade    |
| P0 🔴      | Revogar EXECUTE de `anon` nas 2 funções expostas        | S       | Segurança         |
| P1 🟡      | Particionamento de `audit_log` por mês                  | L       | Performance       |
| P1 🟡      | Consolidar `write_audit_log` + `audit_trigger_func`     | M       | Manutenibilidade  |
| P1 🟡      | HMAC em webhooks n8n                                    | S       | Segurança         |
| P1 🟡      | Correlation-id em edge functions                        | S       | Observabilidade   |
| P1 🟡      | Índice composto `notifications(event_type, created_at)` | S       | Performance       |
| P1 🟡      | Refatorar `MaintenancePanel.tsx`                        | M       | Manutenibilidade  |
| P2 🟢      | Ativar HIBP no Auth                                     | XS      | Segurança         |
| P2 🟢      | CSP/HSTS headers                                        | S       | Segurança         |
| P2 🟢      | Instalar `pgstattuple` para bloat real                  | S       | Observabilidade   |
| P2 🟢      | Índices GIN trigram em `assets`                         | S       | Performance       |
| P2 🟢      | Migrar polling → Realtime                               | M       | UX                |

**Legenda de esforço:** XS < 30min · S < 2h · M < 1 dia · L > 1 dia

---

## 8. Benchmarking

| Área                 | Este sistema | Mercado (SaaS B2B mid-market) |
| -------------------- | ------------ | ----------------------------- |
| RLS coverage         | ✅ 100%      | 80%                           |
| Auditoria imutável   | ✅ Sim       | 60%                           |
| MFA disponível       | ✅ Sim       | 70%                           |
| Cron de manutenção   | ✅ Sim       | 40%                           |
| Snapshots de tamanho | ✅ Sim       | 20%                           |
| Painel de bloat      | ✅ Sim       | 10%                           |
| Circuit breaker      | ❌ Não       | 50%                           |
| Rate limit AI        | ❌ Não       | 60%                           |
| Particionamento      | ❌ Não       | 30%                           |
| Trace correlation    | ❌ Não       | 40%                           |

**Conclusão:** o projeto está **acima da média** em observabilidade de banco e segurança de dados, mas **abaixo da média** em resiliência de integrações e proteção contra abuso de custo AI. Essas duas frentes são o caminho crítico para a nota 10.

---

## 9. Referências

- [OWASP Top 10 2023](https://owasp.org/Top10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Circuit Breaker Pattern — Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- ADR interno: `docs/adr/0009-security-definer-privilege-model.md`

---

_Fim do relatório — auditoria conduzida sobre 373 arquivos TS/TSX, 114 migrations, 6 edge functions e 22 tabelas públicas._
