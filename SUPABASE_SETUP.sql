
-- Coppa del Mondo · setup Supabase semplice
-- Esegui questo script in Supabase > SQL Editor.

create table if not exists public.app_state (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "public can read tournament" on public.app_state;
drop policy if exists "authenticated admin can insert tournament" on public.app_state;
drop policy if exists "authenticated admin can update tournament" on public.app_state;
drop policy if exists "authenticated admin can delete tournament" on public.app_state;

-- Tutti possono leggere la riga pubblica del torneo.
create policy "public can read tournament"
on public.app_state
for select
to anon, authenticated
using (id = 'main');

-- Solo utenti autenticati Supabase possono creare/aggiornare/eliminare i dati.
create policy "authenticated admin can insert tournament"
on public.app_state
for insert
to authenticated
with check (id = 'main');

create policy "authenticated admin can update tournament"
on public.app_state
for update
to authenticated
using (id = 'main')
with check (id = 'main');

create policy "authenticated admin can delete tournament"
on public.app_state
for delete
to authenticated
using (id = 'main');

insert into public.app_state (id, data)
values ('main', '{"rules":{"name":"Coppa del Mondo"},"teams":[],"matches":[]}'::jsonb)
on conflict (id) do nothing;

-- Realtime: abilita gli aggiornamenti live lato pubblico.
alter table public.app_state replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
