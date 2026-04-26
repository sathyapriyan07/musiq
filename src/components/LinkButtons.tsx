import clsx from "clsx";
import type { ReactNode } from "react";

export type LinkCategory = "official" | "live" | "lyrics" | "covers" | "other";

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
              {items.map((item) => (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-full border bg-panel px-4 text-sm text-text hover:bg-panel2"
                >
                  {item.icon ? <span className="text-muted">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

