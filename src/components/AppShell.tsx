import clsx from "clsx";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../auth/AuthContext";

type NavItem = { to: string; label: string };

const PUBLIC_NAV: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/songs", label: "Songs" },
  { to: "/albums", label: "Albums" },
  { to: "/artists", label: "Artists" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Admin" },
  { to: "/admin/songs", label: "Songs" },
  { to: "/admin/albums", label: "Albums" },
  { to: "/admin/artists", label: "Artists" },
  { to: "/admin/channels", label: "Channels" },
  { to: "/admin/links", label: "Links" },
  { to: "/admin/music-rights", label: "Music Rights" },
  { to: "/admin/homepage-sections", label: "Homepage Sections" },
];

function NavPill({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        clsx(
          "inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold surface",
          mobile ? "h-9" : "h-10",
          isActive
            ? "border-transparent bg-panel2 text-text"
            : "bg-panel text-muted hover:bg-panel2 hover:text-text",
        )
      }
    >
      {item.label}
    </NavLink>
  );
}

function DesktopSidebar({ items }: { items: NavItem[] }) {
  const { user, profile, isAdmin, profileAccessDenied, profileError } = useAuth();

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col md:border-r md:bg-panel surface">
      <div className="px-6 py-6">
        <div className="text-lg font-semibold tracking-tight text-text">ONL Music</div>
        <div className="mt-1 text-xs text-muted">Listen • Discover • Curate</div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "rounded-xl px-4 py-3 text-sm font-semibold",
                isActive
                  ? "bg-panel2 text-text shadow-soft"
                  : "text-muted hover:bg-panel2 hover:text-text",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 px-6">
        <SearchBar placeholder="Search…" />
      </div>

      <div className="mt-auto border-t px-5 py-4 text-sm text-muted">
        {user ? (
          <>
            <div className="font-medium text-text">
              {profile?.display_name ?? user.email ?? "Account"}
            </div>
            <div className="text-xs">
              {isAdmin ? "Admin" : "User"} · {user.email ?? "Signed in"}
            </div>
            {profileAccessDenied ? (
              <div className="mt-2 rounded-lg border bg-panel2 p-2 text-xs text-muted">
                Can’t read <span className="text-text">profiles</span> (403). Add
                GRANT/Policy in Supabase.
                {profileError ? <span className="block mt-1">{profileError}</span> : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="font-medium text-text">Guest</div>
            <div className="text-xs">Sign in to sync your library</div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/login?mode=login"
                className="inline-flex h-9 items-center justify-center rounded-full border bg-panel px-4 text-xs font-semibold text-text hover:bg-panel2 surface"
              >
                Login
              </Link>
              <Link
                to="/login?mode=signup"
                className="inline-flex h-9 items-center justify-center rounded-full border bg-[color:var(--accent)] px-4 text-xs font-semibold text-white hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function DesktopHeader({ items }: { items: NavItem[] }) {
  const { user, isAdmin, signOut, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 hidden md:block">
      <div className="border-b bg-panel/40 surface">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <NavPill key={item.to} item={item} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
              >
                Admin Panel
              </Link>
            ) : null}
            {!isLoading && !user ? (
              <>
                <Link
                  to="/login?mode=login"
                  className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
                >
                  Login
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="inline-flex h-10 items-center justify-center rounded-full border bg-[color:var(--accent)] px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            ) : null}
            {!isLoading && user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
              >
                Logout
              </button>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileHeader({ items }: { items: NavItem[] }) {
  const { user, isAdmin, signOut, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-bg md:hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="text-base font-semibold">ONL Music</div>
        <div className="ml-auto flex items-center gap-2">
          {isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
            >
              Admin
            </Link>
          ) : null}
          {!isLoading && !user ? (
            <Link
              to="/login?mode=login"
              className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
            >
              Login
            </Link>
          ) : null}
          {!isLoading && user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
            >
              Logout
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {items.map((item) => (
            <NavPill key={item.to} item={item} mobile />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <SearchBar placeholder="Search…" />
      </div>
    </header>
  );
}

export function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const items = isAdmin ? ADMIN_NAV : PUBLIC_NAV;

  return (
    <div className="min-h-screen">
      <DesktopSidebar items={items} />

      <div className="md:ml-[280px]">
        <DesktopHeader items={items} />
        <MobileHeader items={items} />

        <main className="px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
