"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { Button } from "@/components/ui/button";

export function SigninClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const { user } = useAuth();

  // If already auth'd, bounce.
  useEffect(() => {
    if (user) router.push(next);
  }, [user, next, router]);

  function signInWithGoogle() {
    // Standard Auth.js sign-in URL — full-page redirect.
    const url = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(next)}`;
    window.location.href = url;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <Wrap>
        <section className="py-24 md:py-32">
          <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-vermilion mb-3">
            № 01 <span className="text-paper-3">/ Sign in</span>
          </p>

          <div className="max-w-[480px] mx-auto md:mx-0 relative border border-[var(--rule-strong)] bg-ink-2 p-10 md:p-12">
            <span
              aria-hidden
              className="absolute top-3.5 left-3.5 w-7 h-7 border-t-2 border-l-2 border-vermilion"
            />
            <span
              aria-hidden
              className="absolute bottom-3.5 right-3.5 w-7 h-7 border-b-2 border-r-2 border-vermilion"
            />

            <h1 className="font-display font-black text-[clamp(40px,5vw,56px)] leading-none tracking-[-0.045em] text-paper">
              Back at the{" "}
              <span className="italic text-vermilion font-black">board.</span>
            </h1>
            <p className="mt-5 font-display italic font-medium text-[18px] leading-tight text-paper-2 max-w-[44ch]">
              Sign in with Google. We don&apos;t store passwords; we don&apos;t
              email you weekly digests you didn&apos;t ask for.
            </p>

            <div className="mt-8">
              <Button
                type="button"
                variant="primary"
                size="xl"
                onClick={signInWithGoogle}
              >
                Continue with Google <span aria-hidden>→</span>
              </Button>
            </div>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3">
              no password · <b className="text-paper font-semibold">just a redirect</b>
            </p>
          </div>
        </section>
      </Wrap>
      <SiteFooter />
    </main>
  );
}
