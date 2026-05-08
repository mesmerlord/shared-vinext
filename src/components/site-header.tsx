"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { PushPadSigil } from "@/components/icons";
import { useRouter } from "next/navigation";

/**
 * Site header — top bar (newspaper-style ticker) + masthead (sigil +
 * wordmark + nav + CTA pair) per design.md & V4.
 *
 * Not sticky — the page is meant to be a broadside, scroll top to bottom.
 */
export function SiteHeader({ ticker = TICKER_FALLBACK }: { ticker?: TickerItem[] }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <>
      {/* Top bar */}
      <div className="border-b border-[var(--rule)]">
        <div className="max-w-wrap mx-auto px-7 py-[18px]">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-8 font-mono text-[11px] uppercase tracking-[0.18em] text-paper-3">
            <div className="flex gap-6">
              <span>
                <b className="text-paper">VOL. 02</b>&nbsp;NO. 17
              </span>
              <span>WK 19 / 26</span>
            </div>
            <div className="hidden md:flex gap-8 justify-center overflow-hidden whitespace-nowrap">
              {ticker.slice(0, 5).map((t) => (
                <span key={t.id}>
                  <b className="text-vermilion font-medium">↑</b>&nbsp;{t.label}
                </span>
              ))}
            </div>
            <div className="flex gap-6 md:justify-end">
              <span>FRI · MAY 8 · 2026</span>
              <span>
                <b className="text-paper">SF · NYC · BLR</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-[var(--rule-strong)]">
        <div className="max-w-wrap mx-auto px-7 py-6">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-8">
            <a
              href="/"
              className="flex items-center gap-[14px]"
              aria-label="PushPad home"
            >
              <PushPadSigil width={44} height={44} className="text-paper" />
              <span className="font-display font-black text-[34px] leading-none tracking-[-0.02em] text-paper">
                push<span className="italic text-vermilion">pad</span>.
              </span>
            </a>
            <nav className="hidden md:flex justify-center gap-[38px] font-body text-[14px] text-paper-2">
              <a href="/" className="hover:text-vermilion py-1.5">
                The Board
              </a>
              <a href="/dashboard" className="hover:text-vermilion py-1.5">
                Your Bench
              </a>
              <a href="/submit" className="hover:text-vermilion py-1.5">
                Claim a project
              </a>
              <a href="/admin" className="hover:text-vermilion py-1.5 inline-flex items-center gap-1">
                Admin
                <span
                  aria-hidden
                  className="inline-block w-[5px] h-[5px] rounded-full bg-vermilion ml-1 animate-pulse"
                />
              </a>
            </nav>
            <div className="flex gap-3 items-center justify-end">
              {user ? (
                <>
                  <span className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.18em] text-paper-3">
                    {user.name ?? user.email}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void logout();
                    }}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push("/signin")}
                  >
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => router.push("/submit")}
                  >
                    Claim a project <span aria-hidden>→</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface TickerItem {
  id: string;
  label: string;
}

const TICKER_FALLBACK: TickerItem[] = [
  { id: "1", label: "Tabula v0.7.1" },
  { id: "2", label: "Linkfolio v1.10.0" },
  { id: "3", label: "Crontab.dev v0.4.2" },
  { id: "4", label: "Postroom v0.3.4" },
  { id: "5", label: "Quietkit v2.0.0" },
];
