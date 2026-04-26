import clsx from "clsx";
import type { ChangeEventHandler } from "react";

type Props = {
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className="text-muted"
    >
      <path
        fill="currentColor"
        d="M10.5 3a7.5 7.5 0 1 1 4.7 13.3l4 4-.7.7-4-4A7.5 7.5 0 0 1 10.5 3Zm0 1A6.5 6.5 0 1 0 17 10.5 6.5 6.5 0 0 0 10.5 4Z"
      />
    </svg>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: Props) {
  return (
    <div
      className={clsx(
        "flex h-10 w-full items-center gap-2 rounded-full border bg-panel px-4 surface",
        className,
      )}
    >
      <SearchIcon />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-text placeholder:text-muted outline-none"
      />
    </div>
  );
}
