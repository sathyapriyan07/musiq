import clsx from "clsx";

export type ViewMode = "grid" | "list";

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6h16v1H4V6Zm0 5h16v1H4v-1Zm0 5h16v1H4v-1Z"
      />
    </svg>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border",
        active ? "bg-panel2 text-text" : "bg-panel text-muted hover:bg-panel2",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <ToggleButton
        active={value === "grid"}
        onClick={() => onChange("grid")}
        label="Grid view"
      >
        <GridIcon />
      </ToggleButton>
      <ToggleButton
        active={value === "list"}
        onClick={() => onChange("list")}
        label="List view"
      >
        <ListIcon />
      </ToggleButton>
    </div>
  );
}

