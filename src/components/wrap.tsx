import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Outer container — `max-width: 1440px; padding: 0 56px` per design.md.
 * Below 1100px, padding drops to 28px.
 */
export function Wrap({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-w-wrap mx-auto px-7 lg:px-14",
        className,
      )}
      {...props}
    />
  );
}
