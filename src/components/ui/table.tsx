import { forwardRef, type HTMLAttributes, type TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Per design.md: leaderboard table — 2px paper top/bottom border, 1px
// rule-strong under thead, 1px rule between rows, mono uppercase headers.
// Hover row tinted vermilion. Tabular numerals on by default (set in
// globals.css `.tabular`).
const Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      "w-full caption-bottom border-y-2 border-paper text-[14px] tabular",
      className,
    )}
    {...props}
  />
));
Table.displayName = "Table";

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-[var(--rule-strong)]", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--rule)] transition-colors hover:bg-vermilion/5 data-[state=selected]:bg-vermilion/5",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-3 pt-[14px] pb-[10px] text-left font-mono text-[10px] uppercase tracking-[0.24em] text-paper-3 font-medium [&[data-r]]:text-right",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-[18px] align-middle text-paper", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-3", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
