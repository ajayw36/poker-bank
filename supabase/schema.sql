-- Poker Bank schema
-- Run this in the Supabase SQL editor (SQL Editor > New query > paste > Run).
-- All tables are scoped to the authenticated user via Row Level Security.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Persistent roster of people you play with.
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- One poker night.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- A player's participation in one session.
create table if not exists public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  player_id uuid not null references public.players on delete cascade,
  buy_out numeric,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

-- Individual buy-ins / re-buys (many per session_player).
create table if not exists public.buy_ins (
  id uuid primary key default gen_random_uuid(),
  session_player_id uuid not null references public.session_players on delete cascade,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_session_players_session on public.session_players (session_id);
create index if not exists idx_buy_ins_session_player on public.buy_ins (session_player_id);
create index if not exists idx_sessions_user on public.sessions (user_id);
create index if not exists idx_players_user on public.players (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.buy_ins enable row level security;

-- players: owner only
create policy "players_owner" on public.players
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sessions: owner only
create policy "sessions_owner" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- session_players: authorized via the owning session
create policy "session_players_owner" on public.session_players
  for all using (
    exists (
      select 1 from public.sessions s
      where s.id = session_players.session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_players.session_id and s.user_id = auth.uid()
    )
  );

-- buy_ins: authorized via session_player -> session
create policy "buy_ins_owner" on public.buy_ins
  for all using (
    exists (
      select 1
      from public.session_players sp
      join public.sessions s on s.id = sp.session_id
      where sp.id = buy_ins.session_player_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.session_players sp
      join public.sessions s on s.id = sp.session_id
      where sp.id = buy_ins.session_player_id and s.user_id = auth.uid()
    )
  );
