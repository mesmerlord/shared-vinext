"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Stack-tag multiselect — type a tag and press Enter (or comma) to add it.
 * No fancy autocomplete; deliberately spartan to match the typographic vibe.
 */
export function StackMultiSelect({
  value,
  onChange,
  suggestions,
  max = 10,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  max?: number;
}) {
  const [input, setInput] = useState("");

  function commit(raw: string) {
    const clean = raw.trim().replace(/,$/, "").slice(0, 24);
    if (!clean) return;
    if (value.includes(clean)) return;
    if (value.length >= max) return;
    onChange([...value, clean]);
    setInput("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-[6px] min-h-[28px]">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => remove(tag)}
            className="font-mono uppercase tracking-[0.14em] text-[10px] text-paper-2 px-[7px] py-[3px] border border-[var(--rule-strong)] hover:border-vermilion hover:text-vermilion"
          >
            {tag} ·×
          </button>
        ))}
        {value.length === 0 && (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-3">
            — no stack tags yet
          </span>
        )}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(input);
          } else if (e.key === "Backspace" && !input && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        placeholder="Type a stack tag and press enter — Bun, Postgres, Workers"
      />
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="font-mono uppercase tracking-[0.14em] text-[10px] text-paper-3 px-[7px] py-[3px] border border-[var(--rule)] hover:border-paper hover:text-paper"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
      <p className="font-body text-[12px] text-paper-3">
        Comma- or Enter-separated. Up to {max}. The first 5 show on the board.
      </p>
    </div>
  );
}

export const STACK_SUGGESTIONS = [
  "Next.js",
  "vinext",
  "Bun",
  "Deno",
  "Cloudflare Workers",
  "D1",
  "R2",
  "Postgres",
  "Turso",
  "Drizzle",
  "Prisma",
  "tRPC",
  "Astro",
  "SvelteKit",
  "Remix",
  "HTMX",
  "Go",
  "Rust",
  "Elixir",
  "Phoenix",
  "Tauri",
  "DuckDB",
  "SQLite",
  "Stripe",
];
