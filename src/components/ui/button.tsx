import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Hand-rolled per canonical.md Topic 6 — NOT shadcn CLI. Tokens map to
// design.md component specs: square corners, 1px hairline borders, vermilion
// primary fill with ink text.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-body text-[14px] font-semibold tracking-[0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion disabled:opacity-40 disabled:pointer-events-none rounded-none",
  {
    variants: {
      variant: {
        primary:
          "bg-vermilion text-ink border border-vermilion font-bold hover:bg-paper hover:text-ink hover:border-paper active:bg-vermilion-d active:border-vermilion-d",
        secondary:
          "bg-transparent text-paper border border-[var(--rule-strong)] hover:border-paper",
        ghost:
          "bg-transparent text-paper-2 border-b border-paper hover:text-vermilion hover:border-vermilion",
        destructive:
          "bg-vermilion text-ink border border-vermilion font-bold hover:bg-paper hover:text-ink hover:border-paper",
      },
      size: {
        default: "px-[18px] py-[11px]",
        lg: "px-[22px] py-[14px]",
        xl: "px-6 py-4 text-[15px]",
        sm: "px-3 py-2 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
