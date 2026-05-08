import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Per design.md: ink-3 fill, 1px rule-strong border, square corners, mono
// 14px text in paper. Vermilion border on focus replaces outline.
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full bg-ink-3 text-paper placeholder:text-paper-3 placeholder:italic placeholder:font-display border border-[var(--rule-strong)] px-[14px] py-3 font-mono text-[14px] font-medium rounded-none transition-colors focus:outline-none focus:border-vermilion",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
