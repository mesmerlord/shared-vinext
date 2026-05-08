import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Stack tag / status badge / version badge per design.md.
const badgeVariants = cva(
  "inline-flex items-center font-mono uppercase tracking-[0.14em] rounded-none",
  {
    variants: {
      variant: {
        // Stack chip (default). 1px rule-strong border, paper-2 text.
        stack:
          "border border-[var(--rule-strong)] text-paper-2 px-[7px] py-[3px] text-[10px]",
        // Hot variant — vermilion border + text.
        hot: "border border-vermilion text-vermilion px-[7px] py-[3px] text-[10px]",
        // Status badge.
        status:
          "border border-[var(--rule-strong)] text-paper-2 px-[7px] py-[3px] text-[9px]",
        // Version badge — no border, no fill, just type.
        version:
          "border-0 text-paper px-0 py-0 text-[13px] font-bold tracking-normal normal-case",
      },
    },
    defaultVariants: {
      variant: "stack",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
