-- ════════════════════════════════════════════════════════════════════════════
--  Registro de impresión 3D (filamento) — mismo proyecto Supabase que el Lab
--  Requiere la función es_admin() creada por seguridad.sql (repo BioingenieriaNew).
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.impresiones (
    id          bigint generated always as identity primary key,
    fecha       date        not null,
    nombre      text        not null check (char_length(nombre)   between 1 and 120),
    boleta      text        not null check (char_length(boleta)   between 1 and 20),
    carrera     text        check (carrera in ('Biónica', 'Mecatrónica', 'Telemática', 'ISISA', 'Energía')),
    materia     text        not null check (char_length(materia)  between 1 and 120),
    profesor    text        not null check (char_length(profesor) between 1 and 120),
    piezas      int         not null check (piezas between 1 and 50),
    tiempo_min  int         not null check (tiempo_min between 1 and 10080),   -- duración total en minutos
    filamento   text        not null check (filamento in ('PLA', 'ABS', 'PETG')),
    gramos      numeric(7,1) not null check (gramos > 0 and gramos <= 5000),
    created_at  timestamptz not null default now()
);

-- Para una tabla ya creada con la versión anterior (sin carrera, con TPU/Otro):
alter table public.impresiones add column if not exists carrera text;
alter table public.impresiones drop constraint if exists impresiones_carrera_check;
alter table public.impresiones add  constraint impresiones_carrera_check
    check (carrera in ('Biónica', 'Mecatrónica', 'Telemática', 'ISISA', 'Energía'));
alter table public.impresiones drop constraint if exists impresiones_filamento_check;
alter table public.impresiones add  constraint impresiones_filamento_check
    check (filamento in ('PLA', 'ABS', 'PETG')) not valid;   -- not valid: respeta registros viejos

create index if not exists impresiones_fecha_idx on public.impresiones (fecha);

alter table public.impresiones enable row level security;

drop policy if exists "alumnos_registran_impresion" on public.impresiones;
drop policy if exists "admin_lee_impresiones"       on public.impresiones;
drop policy if exists "admin_edita_impresiones"     on public.impresiones;
drop policy if exists "admin_elimina_impresiones"   on public.impresiones;

-- Alumnos (sin sesión): solo pueden registrar; no pueden ver, editar ni borrar
create policy "alumnos_registran_impresion" on public.impresiones
    for insert to anon with check (true);

-- Administrador: ver, corregir y eliminar
create policy "admin_lee_impresiones"     on public.impresiones for select to authenticated using (public.es_admin());
create policy "admin_edita_impresiones"   on public.impresiones for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin_elimina_impresiones" on public.impresiones for delete to authenticated using (public.es_admin());

grant insert on public.impresiones to anon;
grant select, update, delete on public.impresiones to authenticated;
