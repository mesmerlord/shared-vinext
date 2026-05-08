import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Filter pill. Per design.md: 6px 12px, border-radius 999px, 1px
// rule-strong. Active = vermilion fill + ink text. The 999px is the ONLY
// border-radius allowed in the design — see design.md "Don'ts".
const chipVariants = cva(
  "inline-flex items-center font-mono uppercase tracking-[0.2em] text-[11px] px-3 py-[6px] transition-colors cursor-pointer rounded-full",
  {
    variants: {
      active: {
        true: "bg-vermilion text-ink border border-vermilion font-bold",
        false:
          "bg-transparent text-paper-2 border border-[var(--rule-strong)] hover:border-paper",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export interface ChipProps
  extends HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {}

export function Chip({ className, active, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(chipVariants({ active, className }))}
      {...props}
    />
  );
}
