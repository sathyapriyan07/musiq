import clsx from "clsx";
import type { ReactNode } from "react";

type StateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

function Panel({
  title,
  description,
  action,
  className,
}: StateProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-panel p-6 text-center",
        className,
      )}
    >
      <div className="text-base font-semibold text-text">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <Panel {...props} />;
}

export function ErrorState(props: StateProps) {
  return <Panel {...props} />;
}

