-- VZN sync backend — run once in the Supabase SQL editor.
--
-- One generic table, not six mirrored ones. Nothing queries this server-side:
-- the client pulls its own rows and every screen reads Dexie. Mirroring each
-- Dexie table into typed columns would buy query power nobody uses and cost a
-- Postgres migration every time the local schema gains a field — which it does
-- routinely (`hiddenAt` and `foodName` both landed this week). An opaque jsonb
-- payload keeps the server a relay and lets the app evolve without touching it.
--
-- `updated_at` is epoch milliseconds from the WRITING device, not now(). It is
-- the conflict clock, and it has to be the same number the local row carries or
-- last-write-wins compares two different clocks and thrashes. The cost is that
-- a device with a badly wrong system clock wins or loses everything; for two
-- phones and a laptop that is the right trade against the complexity of vector
-- clocks or server-assigned versions.

create table if not exists public.sync_rows (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  table_name text        not null,
  row_id     text        not null,
  data       jsonb,                        -- null when deleted
  updated_at bigint      not null,         -- epoch ms, client clock
  deleted    boolean     not null default false,
  primary key (user_id, table_name, row_id)
);

-- The only query the client makes: "my rows, changed since cursor, in order".
create index if not exists sync_rows_user_updated_idx
  on public.sync_rows (user_id, updated_at);

alter table public.sync_rows enable row level security;

-- Every policy is scoped to auth.uid(). This is the whole security model: the
-- anon key in the bundle is a public identifier and grants nothing without a
-- session, and a signed-in user cannot address another user's rows at all —
-- there is no filter to forget in client code, because the database refuses.
drop policy if exists "own rows: select" on public.sync_rows;
create policy "own rows: select" on public.sync_rows
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.sync_rows;
create policy "own rows: insert" on public.sync_rows
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.sync_rows;
create policy "own rows: update" on public.sync_rows
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.sync_rows;
create policy "own rows: delete" on public.sync_rows
  for delete using (auth.uid() = user_id);

-- Realtime. Without this the table changes but no websocket event is emitted,
-- and sync silently degrades to the interval and focus triggers — working, but
-- not live, and with nothing on screen to say why.
--
-- Guarded because ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS and
-- errors on a table already in the publication. Every other statement here is
-- re-runnable; without this one the whole script stops being safe to re-run,
-- which is exactly when you need it to be — halfway through a failed setup.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sync_rows'
  ) then
    alter publication supabase_realtime add table public.sync_rows;
  end if;
end $$;

-- REPLICA IDENTITY FULL so the realtime payload carries the whole row. The
-- default (primary key only) would deliver an event naming a row without its
-- data, and the client would have to round-trip for every single change.
alter table public.sync_rows replica identity full;
