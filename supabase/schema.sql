-- Recogidas Benidorm: tablas y permisos.
-- Pegar entero en Supabase > SQL Editor > New query > Run.

create table if not exists public.signups (
  date       date        not null,
  parent     text        not null check (parent in ('miguel','tierra','jaime','nick')),
  cars       smallint    not null default 1 check (cars between 1 and 2),
  created_at timestamptz not null default now(),
  primary key (date, parent)
);

create table if not exists public.nights (
  date       date        primary key,
  off        boolean     not null default true,
  marked_by  text        check (marked_by in ('miguel','tierra','jaime','nick')),
  created_at timestamptz not null default now()
);

-- Solo lunes (1) y martes (2).
alter table public.signups drop constraint if exists signups_weekday;
alter table public.signups add constraint signups_weekday check (extract(isodow from date) in (1,2));
alter table public.nights  drop constraint if exists nights_weekday;
alter table public.nights  add constraint nights_weekday  check (extract(isodow from date) in (1,2));

-- RLS activado y sin políticas: nadie entra con la clave pública.
-- La app accede solo desde el servidor (Vercel) con la clave secreta.
alter table public.signups enable row level security;
alter table public.nights  enable row level security;
