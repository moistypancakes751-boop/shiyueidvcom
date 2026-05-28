create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  username text,
  avatar_url text,
  contact text,
  game_id text,
  main_service text default 'IDV 陪玩',
  points integer not null default 0,
  order_count integer not null default 0,
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
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

drop policy if exists "profiles can read own profile" on public.profiles;
create policy "profiles can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

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
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

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
using (public.is_admin());

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
using (public.is_admin());

drop policy if exists "users can create own orders" on public.orders;
create policy "users can create own orders"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can read own orders" on public.orders;
create policy "users can read own orders"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
