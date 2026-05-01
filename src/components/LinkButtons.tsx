import clsx from "clsx";
import type { ReactNode } from "react";

export type LinkCategory = "official" | "live" | "lyrics" | "covers" | "other";

type PlatformInfo = {
  icon: ReactNode;
  color: string;
};

const PLATFORM_ICONS: Record<string, PlatformInfo> = {
  "Spotify": { icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 3.72-1.138 7.86-.54 10.681 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.18-1.98-8.04-2.58-11.762-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.16 9.34 14.76 10.02 18.681 12.34c.42.18.54.84.3 1.2zm.12-3.36C15.24 8.46 8.52 8.28 5.16 9.46c-.6.18-1.2-.18-1.38-.72-.18-.54.18-1.2.72-1.38C8.88 5.98 16.2 6.16 20.46 9.22c.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>, color: "#1DB954" },
  "Apple Music": { icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 5.124a9.85 9.85 0 0 0-.253-2.53C22.63 1.173 21.224 0 19.714 0H4.286C2.776 0 1.37 1.173.259 2.594A9.85 9.85 0 0 0 .006 5.124L0 5.143v13.714c0 1.51 1.173 2.916 2.594 4.027a9.85 9.85 0 0 0 2.53.253h15.428c1.51 0 2.916-1.173 4.027-2.594a9.85 9.85 0 0 0 .253-2.53V5.143l-.006-.019zm-6.88 13.342a.6.6 0 0 1-.601.6H7.487a.6.6 0 0 1-.6-.6V5.534a.6.6 0 0 1 .6-.6h9.026a.6.6 0 0 1 .6.6v12.932zM19.2 11.4a.9.9 0 0 1-.9.9h-1.8a.9.9 0 0 1-.9-.9V9.9a.9.9 0 0 1 .9-.9h1.8a.9.9 0 0 1 .9.9v1.5z"/></svg>, color: "#FC3C44" },
  "YouTube Music": { icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm-1.5 7.5h-1.5v5.25c0 .414.336.75.75.75h1.5c.414 0 .75-.336.75-.75V7.5zm4.5 0h-1.5v5.25c0 .414.336.75.75.75h1.5c.414 0 .75-.336.75-.75V7.5zM9 17.25h6v1.5H9z"/></svg>, color: "#FF0000" },
  "JioSaavn": { icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.5 6h3c.825 0 1.5.675 1.5 1.5v9c0 .825-.675 1.5-1.5 1.5h-3c-.825 0-1.5-.675-1.5-1.5v-9c0-.825.675-1.5 1.5-1.5z"/></svg>, color: "#FF0000" },
};

export type PlatformLink = {
  href: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  links: Partial<Record<LinkCategory, PlatformLink[]>>;
  className?: string;
};

const ORDER: LinkCategory[] = ["official", "live", "lyrics", "covers", "other"];

function titleCase(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export function LinkButtons({ links, className }: Props) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {ORDER.map((category) => {
        const items = links[category];
        if (!items?.length) return null;
        return (
          <div key={category}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {titleCase(category)}
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const platform = PLATFORM_ICONS[item.label];
                return (
                  <a
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-full border bg-panel px-4 text-sm text-text hover:bg-panel2"
                    style={platform ? { borderColor: platform.color } : undefined}
                  >
                    {platform ? <span className="text-muted">{platform.icon}</span> : null}
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

