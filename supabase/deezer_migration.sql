-- Add Deezer ID columns to existing tables
alter table public.songs add column if not exists deezer_id bigint unique;
alter table public.songs add column if not exists explicit boolean default false;
alter table public.songs add column if not exists deezer_url text;

alter table public.artists add column if not exists deezer_id bigint unique;
alter table public.artists add column if not exists deezer_url text;

alter table public.albums add column if not exists deezer_id bigint unique;
alter table public.albums add column if not exists deezer_url text;

-- Add index for faster lookups
create index if not exists songs_deezer_id_idx on public.songs(deezer_id);
create index if not exists artists_deezer_id_idx on public.artists(deezer_id);
create index if not exists albums_deezer_id_idx on public.albums(deezer_id);
