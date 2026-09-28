import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="max-w-[900px] py-1">
      {eyebrow ? (
        <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-[32px] leading-tight font-normal tracking-[-0.02em]">
          {title}
        </h1>
        {action}
      </div>
      {description ? (
        <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
