import clsx from "clsx";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Shape = "square" | "round";
type Aspect = "square" | "poster" | "video";

type Props = {
  title: string;
  subtitle?: string;
  to?: string;
  imageUrl?: string;
  shape?: Shape;
  aspect?: Aspect;
  rightSlot?: ReactNode;
};

function aspectClass(aspect: Aspect) {
  switch (aspect) {
    case "poster":
      return "aspect-[3/4]";
    case "video":
      return "aspect-video";
    case "square":
    default:
      return "aspect-square";
  }
}

export function MediaCard({
  title,
  subtitle,
  to,
  imageUrl,
  shape = "square",
  aspect = "square",
  rightSlot,
}: Props) {
  const content = (
    <div className="group rounded-xl border bg-panel p-3 transition hover:bg-panel2">
      <div
        className={clsx(
          "w-full overflow-hidden bg-panel2",
          aspectClass(aspect),
          shape === "round" ? "rounded-full" : "rounded-lg",
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <span className="text-xs uppercase tracking-wider">No Image</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{title}</div>
          {subtitle ? (
            <div className="truncate text-xs text-muted">{subtitle}</div>
          ) : null}
        </div>
        {rightSlot ? <div className="ml-auto shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

