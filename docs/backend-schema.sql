-- Esquema sugerido para persistência e administração.
-- Adaptar ao provedor escolhido. Não colocar segredos no frontend.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visitor_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visited_ids text[] not null default '{}',
  quiz_results jsonb not null default '{}'::jsonb,
  favorites text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists president_records (
  id text primary key,
  status text not null check (status in ('draft','review','published','archived')),
  payload jsonb not null,
  revision_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS: cada usuário lê/escreve apenas seus dados.
-- Administração: papel 'admin' validado no servidor, nunca enviado pelo cliente.
