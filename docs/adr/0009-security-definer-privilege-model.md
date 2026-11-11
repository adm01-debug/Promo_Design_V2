# ADR 0009: Modelo de Privilégios para Funções `SECURITY DEFINER`

## Status

Aceito — 2026-07-12

## Contexto

No PostgreSQL, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por padrão. Combinado com `SECURITY DEFINER` (execução com privilégios do owner), qualquer bug lógico numa função (check de role invertido, argumento não sanitizado, `search_path` mutável) permite escalada de privilégio a partir de qualquer sessão — inclusive `anon`.

O linter do Supabase (regras `0028` e `0029`) sinalizou 37 funções expostas indevidamente.

## Decisão

Adotamos **least privilege explícito** para toda função `SECURITY DEFINER` no schema `public`:

1. **Revogação padrão.** Toda função SECDEF recebe `REVOKE EXECUTE ... FROM PUBLIC, anon` na mesma migration em que é criada/alterada.
2. **Grant granular.** `GRANT EXECUTE` é concedido apenas ao mínimo necessário:
   - **`authenticated`**: helpers de RLS (`has_role`, `is_member_of`, etc.), RPCs de painel admin com check interno (`get_db_health`, `get_live_activity`, `get_slow_queries`, `get_cache_hit_stats`, `get_replication_status`, `check_replication_slot_alerts`, `run_manual_vacuum`), RPCs de busca (`search_assets_ranked`), e `accept_organization_invite`.
   - **`service_role`**: funções de manutenção invocadas por `pg_cron` ou edge functions com Service Role (`cleanup_expired_data`, `run_scheduled_*`, `capture_table_size_snapshot`, wrappers legados).
   - **Ninguém (apenas owner)**: trigger functions (`log_*`, `notify_*`, `handle_*`, `write_audit_log`, `audit_trigger_func`, `add_creator_as_owner`, `validate_*`). Triggers executam no contexto do owner da tabela, então não precisam de grant.
3. **`search_path` fixado.** Toda função declara `SET search_path TO 'public'` (ou `'public', 'extensions'`) para mitigar CVE-2018-1058.
4. **Check interno redundante.** Mesmo com grants restritos, funções admin verificam `auth.role() = 'service_role'` ou `is_any_org_admin(auth.uid())` no corpo. Defesa em profundidade.
5. **Wrappers de compatibilidade.** Overloads legados (`check_ai_quota(uuid)`, `cleanup_expired_data(int,int,int)`) delegam à assinatura canônica em vez de duplicar lógica — evita drift de comportamento.

## Consequências

**Positivas**

- Superfície de ataque reduzida: `anon` não consegue mais invocar 42 funções SECDEF.
- Auditoria pelo linter converge: warnings `0028`/`0029` restringem-se apenas às funções que legitimamente precisam de `authenticated`.
- Modelo replicável: toda nova função SECDEF segue o mesmo padrão (revoke → grant granular).

**Negativas**

- Boilerplate adicional em cada migration de função.
- Novos endpoints admin exigem grant explícito — esquecer causa erro `permission denied`, mas isso é preferível a exposição.

## Referências

- [Supabase Linter 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase Linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [PostgreSQL — CREATE FUNCTION security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- CVE-2018-1058 — `search_path` hijacking.
- ADR-0002 — Multi-tenant Security via RLS.
