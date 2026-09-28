import type * as React from "react";
import { cn } from "@/lib/utils";

type LabelProps = Omit<React.ComponentProps<"label">, "htmlFor"> & {
  htmlFor: string;
};

function Label({ className, children, htmlFor, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
