-- user_belongs_to_org (uuid, uuid) e get_index_bloat_estimate retornam boolean/bigint a
-- partir de organization_members e sao SECURITY DEFINER, ou seja, leem ignorando RLS.
-- Nenhuma das duas aparece em policy (0 usos em pg_policies) e user_belongs_to_org nao e
-- chamada pelo front, mas ambas estavam com EXECUTE aberto para PUBLIC/anon: qualquer
-- visitante nao autenticado podia confirmar se um user_id pertence a uma organization_id.
-- Os helpers que as policies usam (is_member_of, has_any_role, has_role) continuam com
-- EXECUTE para anon de proposito: a policy precisa ser avaliada, nao dar erro 42501.

revoke execute on function public.user_belongs_to_org(uuid, uuid) from public;
revoke execute on function public.user_belongs_to_org(uuid, uuid) from anon;
grant execute on function public.user_belongs_to_org(uuid, uuid) to authenticated, service_role;

revoke execute on function public.get_index_bloat_estimate(bigint, integer) from public;
revoke execute on function public.get_index_bloat_estimate(bigint, integer) from anon;
grant execute on function public.get_index_bloat_estimate(bigint, integer) to authenticated, service_role;

do $verif$
begin
  if has_function_privilege('anon', 'public.user_belongs_to_org(uuid, uuid)', 'EXECUTE') then
    raise exception 'user_belongs_to_org ainda executavel por anon';
  end if;
  if has_function_privilege('anon', 'public.get_index_bloat_estimate(bigint, integer)', 'EXECUTE') then
    raise exception 'get_index_bloat_estimate ainda executavel por anon';
  end if;
  if not has_function_privilege('authenticated', 'public.user_belongs_to_org(uuid, uuid)', 'EXECUTE') then
    raise exception 'authenticated perdeu user_belongs_to_org';
  end if;
  if not has_function_privilege('authenticated', 'public.get_index_bloat_estimate(bigint, integer)', 'EXECUTE') then
    raise exception 'authenticated perdeu get_index_bloat_estimate';
  end if;
end
$verif$;