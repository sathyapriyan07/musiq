import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./pages/HomePage";
import { SongsPage } from "./pages/SongsPage";
import { AlbumsPage } from "./pages/AlbumsPage";
import { ArtistsPage } from "./pages/ArtistsPage";
import { SongDetailPage } from "./pages/SongDetailPage";
import { AlbumDetailPage } from "./pages/AlbumDetailPage";
import { ArtistDetailPage } from "./pages/ArtistDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminHome } from "./pages/admin/AdminHome";
import { AdminSongsPage } from "./pages/admin/AdminSongsPage";
import { AdminAlbumsPage } from "./pages/admin/AdminAlbumsPage";
import { AdminArtistsPage } from "./pages/admin/AdminArtistsPage";
import { AdminLinksPage } from "./pages/admin/AdminLinksPage";
import { AdminMusicRightsPage } from "./pages/admin/AdminMusicRightsPage";
import { AdminHomepageSectionsPage } from "./pages/admin/AdminHomepageSectionsPage";
import { AdminGate } from "./auth/AdminGate";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/songs" element={<SongsPage />} />
        <Route path="/songs/:songId" element={<SongDetailPage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
        <Route path="/artists" element={<ArtistsPage />} />
        <Route path="/artists/:artistId" element={<ArtistDetailPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AdminGate />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/songs" element={<AdminSongsPage />} />
          <Route path="/admin/albums" element={<AdminAlbumsPage />} />
          <Route path="/admin/artists" element={<AdminArtistsPage />} />
          <Route path="/admin/links" element={<AdminLinksPage />} />
          <Route path="/admin/music-rights" element={<AdminMusicRightsPage />} />
          <Route
            path="/admin/homepage-sections"
            element={<AdminHomepageSectionsPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
