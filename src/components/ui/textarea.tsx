import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full bg-ink-3 text-paper placeholder:text-paper-3 placeholder:italic placeholder:font-display border border-[var(--rule-strong)] px-[14px] py-3 font-mono text-[14px] font-medium rounded-none transition-colors focus:outline-none focus:border-vermilion min-h-[140px] resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
