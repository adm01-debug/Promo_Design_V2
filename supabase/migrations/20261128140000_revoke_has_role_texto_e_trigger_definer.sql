-- has_role(uuid, text) e o overload legado anterior ao enum app_role: ele ignora o
-- isolamento por organizacao (pega a PRIMEIRA organization_members do usuario com LIMIT 1)
-- e estava com EXECUTE aberto para PUBLIC e anon. Nenhuma policy o usa - as 3 policies que
-- chamam has_role passam 'owner'::app_role, ou seja, o overload enum (uuid, uuid, app_role).
-- Nenhum rpc() do front o chama. Ele so servia como bypass de tenant para quem soubesse o
-- user_id de outra organizacao, entao some de anon/PUBLIC e so continua com o grant minimo.
-- As outras SECURITY DEFINER expostas (has_role enum, has_any_role, is_member_of) precisam
-- de anon porque as policies sao avaliadas sob a role da requisicao; o trigger
-- tg_integration_technique_map_normalize nunca e chamado por RPC (RETURNS trigger).

revoke execute on function public.has_role(uuid, text) from public;
revoke execute on function public.has_role(uuid, text) from anon;
revoke execute on function public.has_role(uuid, text) from authenticated;
grant execute on function public.has_role(uuid, text) to service_role;

revoke execute on function public.tg_integration_technique_map_normalize() from public;
revoke execute on function public.tg_integration_technique_map_normalize() from anon;
revoke execute on function public.tg_integration_technique_map_normalize() from authenticated;

do $verif$
begin
  if has_function_privilege('anon', 'public.has_role(uuid, text)', 'EXECUTE') then
    raise exception 'has_role(uuid, text) ainda executavel por anon';
  end if;
  if has_function_privilege('public', 'public.has_role(uuid, text)', 'EXECUTE') then
    raise exception 'has_role(uuid, text) ainda executavel por PUBLIC';
  end if;
  if has_function_privilege('anon', 'public.tg_integration_technique_map_normalize()', 'EXECUTE') then
    raise exception 'trigger function ainda executavel por anon';
  end if;
  -- os helpers usados por policy NAO podem perder anon, senao a policy quebra com 42501
  if not has_function_privilege('anon', 'public.has_role(uuid, uuid, app_role)', 'EXECUTE') then
    raise exception 'has_role enum perdeu anon e vai quebrar policy';
  end if;
  if not has_function_privilege('anon', 'public.is_member_of(uuid, uuid)', 'EXECUTE') then
    raise exception 'is_member_of perdeu anon e vai quebrar policy';
  end if;
  if not has_function_privilege('anon', 'public.has_any_role(uuid, uuid, app_role[])', 'EXECUTE') then
    raise exception 'has_any_role perdeu anon e vai quebrar policy';
  end if;
end
$verif$;