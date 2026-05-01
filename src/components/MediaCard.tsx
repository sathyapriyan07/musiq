import clsx from "clsx";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Shape = "square" | "round";
type Aspect = "square" | "poster" | "video";
type Variant = "default" | "artwork";

type Props = {
  title: string;
  subtitle?: string;
  to?: string;
  imageUrl?: string;
  shape?: Shape;
  aspect?: Aspect;
  variant?: Variant;
  rightSlot?: ReactNode;
  className?: string;
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
  variant = "default",
  rightSlot,
  className,
}: Props) {
  const content = (
    <div
      className={clsx(
        variant === "artwork"
          ? "group transition"
          : "group rounded-2xl bg-panel p-3 transition hover:bg-panel2 surface shadow-soft",
        className,
      )}
    >
      <div
        className={clsx(
          "relative w-full overflow-hidden bg-panel2",
          aspectClass(aspect),
          shape === "round" ? "rounded-full" : variant === "artwork" ? "rounded-2xl" : "rounded-lg",
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <span className="text-xs uppercase tracking-wider">No Image</span>
          </div>
        )}

        {shape !== "round" ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : null}
      </div>

      <div className={clsx("flex items-start gap-3", variant === "artwork" ? "mt-2 px-1" : "mt-3")}>
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
