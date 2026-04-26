# musiq

## Supabase schema notes

This app uses:

- `artists`
- `albums` (still uses `albums.artist_id` as the primary artist for public display)
- `songs` (still uses `songs.primary_artist_id` as the primary artist for public display)
- `song_links`

### Multi-artist credits

Admin supports:

- Multiple artists per song (with optional `role` per artist)
- Multiple artists per album (no roles)

Create the join tables by running `supabase/join_tables.sql` in the Supabase SQL editor.

### Song streaming links

Admin can store Spotify / Apple Music / YouTube Music / JioSaavn links in `song_links` with:

- `category = 'official'`
- `platform` = one of `Spotify`, `Apple Music`, `YouTube Music`, `JioSaavn`
