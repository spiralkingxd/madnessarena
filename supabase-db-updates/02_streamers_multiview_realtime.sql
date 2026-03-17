-- Normaliza estrutura da tabela streamers para suporte ao toggle de multiview e realtime.

create table if not exists public.streamers (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  is_official boolean not null default false,
  is_active boolean not null default true,
  selected_for_multiview boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.streamers add column if not exists is_official boolean;
alter table public.streamers add column if not exists is_active boolean;
alter table public.streamers add column if not exists selected_for_multiview boolean;
alter table public.streamers add column if not exists created_at timestamptz;

update public.streamers
set is_official = false
where is_official is null;

update public.streamers
set is_active = coalesce(is_active, selected_for_multiview, true)
where is_active is null;

update public.streamers
set selected_for_multiview = coalesce(selected_for_multiview, is_active, true)
where selected_for_multiview is null;

update public.streamers
set created_at = timezone('utc', now())
where created_at is null;

alter table public.streamers alter column is_official set default false;
alter table public.streamers alter column is_active set default true;
alter table public.streamers alter column selected_for_multiview set default true;
alter table public.streamers alter column created_at set default timezone('utc', now());

alter table public.streamers alter column is_official set not null;
alter table public.streamers alter column is_active set not null;
alter table public.streamers alter column selected_for_multiview set not null;
alter table public.streamers alter column created_at set not null;

create or replace function public.sync_streamers_multiview_flags()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_active is null and new.selected_for_multiview is null then
      new.is_active := true;
      new.selected_for_multiview := true;
    elsif new.is_active is null then
      new.is_active := new.selected_for_multiview;
    elsif new.selected_for_multiview is null then
      new.selected_for_multiview := new.is_active;
    end if;
    return new;
  end if;

  if new.is_active is distinct from old.is_active then
    new.selected_for_multiview := new.is_active;
  elsif new.selected_for_multiview is distinct from old.selected_for_multiview then
    new.is_active := new.selected_for_multiview;
  end if;

  new.is_active := coalesce(new.is_active, true);
  new.selected_for_multiview := coalesce(new.selected_for_multiview, new.is_active, true);

  return new;
end;
$$;

drop trigger if exists streamers_sync_multiview_flags on public.streamers;
create trigger streamers_sync_multiview_flags
before insert or update on public.streamers
for each row
execute function public.sync_streamers_multiview_flags();

alter table public.streamers enable row level security;

drop policy if exists "Public can read streamers" on public.streamers;
create policy "Public can read streamers"
on public.streamers
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can modify streamers" on public.streamers;
create policy "Admins can modify streamers"
on public.streamers
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'streamers'
  ) then
    execute 'alter publication supabase_realtime add table public.streamers';
  end if;
exception
  when others then
    null;
end
$$;
