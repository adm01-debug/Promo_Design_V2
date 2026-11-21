-- Brand Guidelines versioning.

-- Every save of brand_guidelines snapshots the full row (history), so the
-- /clients/:clientId/brand/history screen can diff and restore any revision.

create table if not exists public.brand_guidelines_history (
  id uuid not null default gen_random_uuid() primary key,
  brand_guideline_id uuid not null references public.brand_guidelines(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  snapshot jsonb not null,
  change_summary text,
  changed_by uuid references auth.users(id) on delete set null,
  version integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bg_history_guideline
  on public.brand_guidelines_history(brand_guideline_id, version desc);
create index if not exists idx_bg_history_org
  on public.brand_guidelines_history(organization_id, created_at desc);

create or replace function public.brand_guidelines_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  _next integer;
  _prev jsonb;
  _summary text;
begin
  select coalesce(max(version), 0) + 1
    into _next
    from public.brand_guidelines_history
   where brand_guideline_id = new.id;

  -- Short human-readable summary of what changed vs previous snapshot.
  _prev := null;
  _summary := 'Versão inicial';
  select snapshot into _prev
    from public.brand_guidelines_history
   where brand_guideline_id = new.id
   order by version desc
   limit 1;

  if _prev is not null then
    if _prev ->> 'notes' is distinct from new.notes then
      _summary := 'Notas atualizadas';
    elsif _prev -> 'primary_colors' is distinct from new.primary_colors
       or _prev -> 'secondary_colors' is distinct from new.secondary_colors
       or _prev -> 'fonts' is distinct from new.fonts then
      _summary := 'Cores/fontes atualizadas';
    elsif _prev -> 'do_rules' is distinct from new.do_rules
       or _prev -> 'dont_rules' is distinct from new.dont_rules then
      _summary := 'Regras atualizadas';
    elsif _prev -> 'logo_asset_id' is distinct from to_jsonb(new.logo_asset_id) then
      _summary := 'Logo atualizado';
    else
      _summary := 'Revisão';
    end if;
  end if;

  insert into public.brand_guidelines_history (
    brand_guideline_id, organization_id, client_id, snapshot,
    change_summary, changed_by, version
  ) values (
    new.id, new.organization_id, new.client_id,
    to_jsonb(new) - 'id',
    _summary, auth.uid(), _next
  );

  return new;
end;
$$;

drop trigger if exists trg_brand_guidelines_snapshot on public.brand_guidelines;
create trigger trg_brand_guidelines_snapshot
  after insert or update on public.brand_guidelines
  for each row execute function public.brand_guidelines_snapshot();

alter table public.brand_guidelines_history enable row level security;

create policy "Members can view brand history"
  on public.brand_guidelines_history for select to authenticated
  using (public.is_member_of(auth.uid(), organization_id));

create policy "Members can insert brand history"
  on public.brand_guidelines_history for insert to authenticated
  with check (public.is_member_of(auth.uid(), organization_id));

create policy "Members can delete brand history"
  on public.brand_guidelines_history for delete to authenticated
  using (public.is_member_of(auth.uid(), organization_id));

grant select, insert, delete on public.brand_guidelines_history to authenticated;