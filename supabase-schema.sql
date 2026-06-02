create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  username text,
  avatar_url text,
  contact text,
  game_id text,
  main_service text default 'IDV 陪玩',
  security_snapshot jsonb not null default '{}'::jsonb,
  points integer not null default 0,
  order_count integer not null default 0,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_requests (
  id uuid primary key default gen_random_uuid(),
  order_code text unique default ('SYB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  source text not null default 'site',
  action text not null check (action in ('recharge', 'withdraw')),
  discord_id text not null,
  discord_name text,
  coins integer not null check (coins > 0),
  rmb_amount numeric(10, 2) not null,
  payment_method text,
  status text not null default 'pending',
  bot_notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('add', 'remove')),
  coins integer not null check (coins > 0),
  balance_after integer,
  reason text,
  operator_discord_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.idv_player_stats (
  username text primary key,
  server text,
  survivor_tier text,
  survivor_winrate numeric(5, 2),
  survivor_matches integer,
  hunter_tier text,
  hunter_winrate numeric(5, 2),
  hunter_matches integer,
  source text not null default 'admin',
  updated_by_discord_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.idv_leaderboard_entries (
  leaderboard_key text not null,
  rank integer not null,
  server text,
  side text,
  username text not null,
  tier text,
  winrate numeric(5, 2),
  matches integer,
  character_name text,
  knowledge_points integer,
  source text not null default 'game_export',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (leaderboard_key, rank)
);

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_label text,
  speaker text not null,
  message text not null,
  ip text,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_label text,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  ip text,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_label text,
  category text not null default 'IDV 陪玩',
  status text not null default 'new',
  amount numeric(10, 2),
  note text,
  order_type text,
  details jsonb not null default '{}'::jsonb,
  claimed_by_discord_id text,
  claimed_by_label text,
  claimed_at timestamptz,
  reception_discord_id text,
  reception_label text,
  source_channel_id text,
  source_message_id text,
  private_channel_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists order_type text;
alter table public.orders add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists claimed_by_discord_id text;
alter table public.orders add column if not exists claimed_by_label text;
alter table public.orders add column if not exists claimed_at timestamptz;
alter table public.orders add column if not exists reception_discord_id text;
alter table public.orders add column if not exists reception_label text;
alter table public.orders add column if not exists source_channel_id text;
alter table public.orders add column if not exists source_message_id text;
alter table public.orders add column if not exists private_channel_id text;
alter table public.profiles add column if not exists security_snapshot jsonb not null default '{}'::jsonb;

alter table public.coin_requests add column if not exists source text not null default 'site';
alter table public.coin_requests add column if not exists order_code text;
alter table public.coin_requests add column if not exists action text;
alter table public.coin_requests add column if not exists discord_id text;
alter table public.coin_requests add column if not exists discord_name text;
alter table public.coin_requests add column if not exists coins integer;
alter table public.coin_requests add column if not exists rmb_amount numeric(10, 2);
alter table public.coin_requests add column if not exists payment_method text;
alter table public.coin_requests add column if not exists status text not null default 'pending';
alter table public.coin_requests add column if not exists bot_notified boolean not null default false;
update public.coin_requests
set order_code = 'SYB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where order_code is null;
alter table public.coin_requests alter column order_code set default ('SYB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
create unique index if not exists coin_requests_order_code_idx on public.coin_requests(order_code);

alter table public.coin_transactions add column if not exists discord_id text;
alter table public.coin_transactions add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.coin_transactions add column if not exists action text;
alter table public.coin_transactions add column if not exists coins integer;
alter table public.coin_transactions add column if not exists balance_after integer;
alter table public.coin_transactions add column if not exists reason text;
alter table public.coin_transactions add column if not exists operator_discord_id text;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.support_messages enable row level security;
alter table public.admin_logs enable row level security;
alter table public.orders enable row level security;
alter table public.coin_requests enable row level security;
alter table public.coin_transactions enable row level security;

revoke insert, update on public.profiles from public, anon, authenticated;
grant insert (id, discord_id, username, avatar_url, contact, game_id, main_service, security_snapshot, updated_at)
on public.profiles
to authenticated;
grant update (id, discord_id, username, avatar_url, contact, game_id, main_service, security_snapshot, updated_at)
on public.profiles
to authenticated;

revoke insert, update on public.orders from public, anon, authenticated;
grant insert (user_id, customer_label, category, amount, note, order_type, details)
on public.orders
to authenticated;
grant update on public.orders to authenticated;

drop policy if exists "profiles can read own profile" on public.profiles;
create policy "profiles can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or private.is_admin());

drop policy if exists "profiles can insert own profile" on public.profiles;
create policy "profiles can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles can update own profile" on public.profiles;
create policy "profiles can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() or private.is_admin())
with check (id = auth.uid() or private.is_admin());

drop policy if exists "anyone can send support messages" on public.support_messages;
create policy "anyone can send support messages"
on public.support_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "admins can read support messages" on public.support_messages;
create policy "admins can read support messages"
on public.support_messages
for select
to authenticated
using (private.is_admin());

drop policy if exists "anyone can write admin logs" on public.admin_logs;
create policy "anyone can write admin logs"
on public.admin_logs
for insert
to anon, authenticated
with check (true);

drop policy if exists "admins can read admin logs" on public.admin_logs;
create policy "admins can read admin logs"
on public.admin_logs
for select
to authenticated
using (private.is_admin());

drop policy if exists "users can create own orders" on public.orders;
create policy "users can create own orders"
on public.orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'new'
  and claimed_by_discord_id is null
  and claimed_by_label is null
  and claimed_at is null
  and reception_discord_id is null
  and reception_label is null
  and source_channel_id is null
  and source_message_id is null
  and private_channel_id is null
);

drop policy if exists "users can read own orders" on public.orders;
create policy "users can read own orders"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "anyone can create coin requests" on public.coin_requests;

drop policy if exists "users can read own coin requests" on public.coin_requests;
create policy "users can read own coin requests"
on public.coin_requests
for select
to authenticated
using (discord_id = (
  select discord_id from public.profiles where id = auth.uid()
) or private.is_admin());

drop policy if exists "admins can read coin transactions" on public.coin_transactions;
create policy "admins can read coin transactions"
on public.coin_transactions
for select
to authenticated
using (private.is_admin());

create or replace function public.create_coin_request(
  p_source text,
  p_action text,
  p_discord_id text,
  p_discord_name text,
  p_coins integer,
  p_payment_method text
)
returns public.coin_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_pending public.coin_requests;
  recent_request public.coin_requests;
  created_request public.coin_requests;
begin
  if p_action not in ('recharge', 'withdraw') then
    raise exception 'INVALID_ACTION';
  end if;

  if p_discord_id is null or length(trim(p_discord_id)) < 5 then
    raise exception 'INVALID_DISCORD_ID';
  end if;

  if p_coins is null or p_coins <= 0 then
    raise exception 'INVALID_COIN_AMOUNT';
  end if;

  select *
  into existing_pending
  from public.coin_requests
  where discord_id = trim(p_discord_id)
    and status = 'pending'
  order by created_at desc
  limit 1;

  if existing_pending.id is not null then
    raise exception 'ACTIVE_COIN_REQUEST:%', existing_pending.order_code;
  end if;

  select *
  into recent_request
  from public.coin_requests
  where discord_id = trim(p_discord_id)
    and created_at > now() - interval '10 minutes'
  order by created_at desc
  limit 1;

  if recent_request.id is not null then
    raise exception 'COOLDOWN_10_MINUTES:%', recent_request.order_code;
  end if;

  insert into public.coin_requests (
    source,
    action,
    discord_id,
    discord_name,
    coins,
    rmb_amount,
    payment_method,
    status,
    bot_notified
  )
  values (
    coalesce(nullif(trim(p_source), ''), 'site'),
    p_action,
    trim(p_discord_id),
    nullif(trim(p_discord_name), ''),
    p_coins,
    round((p_coins::numeric / 10), 2),
    nullif(trim(p_payment_method), ''),
    'pending',
    false
  )
  returning * into created_request;

  return created_request;
end;
$$;

grant execute on function public.create_coin_request(text, text, text, text, integer, text) to anon, authenticated;

drop function if exists public.is_admin();
