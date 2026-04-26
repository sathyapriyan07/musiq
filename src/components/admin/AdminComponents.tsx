import clsx from "clsx";
import type { ReactNode } from "react";

export type AdminButtonVariant = "primary" | "secondary" | "danger";

export function AdminButton({
  variant = "secondary",
  children,
  onClick,
  type = "button",
  disabled,
}: {
  variant?: AdminButtonVariant;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variantClass =
    variant === "primary"
      ? "bg-accent text-black hover:opacity-90"
      : variant === "danger"
        ? "bg-red-500 text-white hover:opacity-90"
        : "bg-transparent text-text hover:bg-panel2";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-full border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
      )}
    >
      {children}
    </button>
  );
}

export function AdminEmpty({
  title = "Nothing here yet",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-panel p-10 text-center">
      <div className="text-base font-semibold text-text">{title}</div>
      {description ? <div className="mt-2 text-sm text-muted">{description}</div> : null}
    </div>
  );
}

export function AdminCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-panel">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="text-sm font-semibold text-text">{title}</div>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-10">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-panel">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="text-sm font-semibold text-text">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-panel hover:bg-panel2"
              aria-label="Close"
              title="Close"
            >
              <span className="text-muted">✕</span>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
          {footer ? <div className="border-t p-5">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  keyForRow,
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  keyForRow: (row: Row) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse bg-panel text-sm">
        <thead>
          <tr className="border-b bg-panel">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyForRow(row)} className="border-b last:border-b-0">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-text">
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

