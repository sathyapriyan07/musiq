-- Join tables for multi-artist credits
-- Run in Supabase SQL editor (or your Postgres migrations).

create table if not exists public.song_artists (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text null,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  primary key (song_id, artist_id)
);

create index if not exists song_artists_song_id_sort_order_idx
  on public.song_artists (song_id, sort_order);

create table if not exists public.album_artists (
  album_id uuid not null references public.albums(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  primary key (album_id, artist_id)
);

create index if not exists album_artists_album_id_sort_order_idx
  on public.album_artists (album_id, sort_order);

