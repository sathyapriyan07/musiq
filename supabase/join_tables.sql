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

alter table public.song_artists enable row level security;

drop policy if exists "Admins can manage song artists" on public.song_artists;

grant select, insert, update, delete on table public.song_artists to authenticated;
grant select on table public.song_artists to anon;

create policy "Admins can manage song artists"
  on public.song_artists
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Public can read song artists" on public.song_artists;

create policy "Public can read song artists"
  on public.song_artists
  for select
  using (
    exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.is_published = true
    )
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.is_published = true
    )
  );

create table if not exists public.album_artists (
  album_id uuid not null references public.albums(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  primary key (album_id, artist_id)
);

create index if not exists album_artists_album_id_sort_order_idx
  on public.album_artists (album_id, sort_order);

alter table public.album_artists enable row level security;

drop policy if exists "Admins can manage album artists" on public.album_artists;

grant select, insert, update, delete on table public.album_artists to authenticated;
grant select on table public.album_artists to anon;

create policy "Admins can manage album artists"
  on public.album_artists
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "Public can read album artists" on public.album_artists;

create policy "Public can read album artists"
  on public.album_artists
  for select
  using (
    exists (
      select 1
      from public.albums al
      where al.id = album_id
        and al.is_published = true
    )
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.is_published = true
    )
  );
