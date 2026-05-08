"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { PageLockup } from "@/components/page-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError, FormErrorCard } from "@/components/form-error";

export function UpdateClient({ slug }: { slug: string }) {
  const router = useRouter();
  const productQuery = trpc.products.getMine.useQuery({ slug });
  const product = productQuery.data;

  const [summary, setSummary] = useState("");
  const [mrrCents, setMrrCents] = useState("");
  const [activeUsers, setActiveUsers] = useState("");
  const [deploys, setDeploys] = useState("");
  const [error, setError] = useState<string | null>(null);

  const post = trpc.updates.post.useMutation({
    onSuccess: () => {
      router.push(`/p/${slug}`);
    },
    onError: (e) => setError(e.message),
  });

  if (productQuery.isLoading) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <Wrap>
          <div className="py-24 font-mono text-[12px] uppercase tracking-[0.22em] text-paper-3">
            Reading the project.
          </div>
        </Wrap>
        <SiteFooter />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <Wrap>
          <div className="py-24">
            <FormErrorCard
              title="Off the bench."
              body="That project doesn't exist or isn't yours."
            />
          </div>
        </Wrap>
        <SiteFooter />
      </main>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (summary.trim().length < 8) {
      setError("Tell us at least one sentence — 8+ characters.");
      return;
    }
    if (!product) return;
    post.mutate({
      productId: product.id,
      summary: summary.trim(),
      metrics: {
        ...(mrrCents.trim() ? { mrrCents: Math.round(parseFloat(mrrCents) * 100) } : {}),
        ...(activeUsers.trim() ? { activeUsers: parseInt(activeUsers, 10) } : {}),
        ...(deploys.trim() ? { deploys: parseInt(deploys, 10) } : {}),
      },
    });
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <Wrap>
        <PageLockup
          kickerNumber="03"
          kickerName={`Update · ${product.name}`}
          title="Tell the board what you"
          accentWord="shipped."
          deck={
            <>
              One line. The work is the post. Composite-unique on this ISO
              week — re-submitting overwrites.
            </>
          }
          meta={
            <>
              Window <b className="text-paper font-semibold">this week</b>
            </>
          }
        />

        <div className="max-w-form mx-auto py-10 md:py-16">
          {error ? (
            <FormErrorCard title="Won't post." body={error} />
          ) : null}

          <form onSubmit={onSubmit} className="space-y-10">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-vermilion border-b border-[var(--rule-strong)] pb-2.5 mb-6">
                № 01 <span className="text-paper-3">/ The post</span>
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Shipped RSS-as-portfolio. You can now subscribe to a person's deploys."
                  maxLength={560}
                  className="min-h-[120px]"
                  required
                />
                <p className="font-body text-[12px] text-paper-3">
                  Plain English. One line. The italic Fraunces quote on the
                  board comes from this.
                </p>
                <FormError message={summary.length === 0 ? null : null} />
              </div>

              {/* Live preview */}
              {summary.trim() && (
                <div className="mt-6 border-t-2 border-paper border-b-2 px-3 py-[18px]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper-3 mb-2">
                    Preview ─ as it shows on the board
                  </p>
                  <p className="font-display italic font-medium text-[16px] leading-[1.45] text-paper">
                    &ldquo;{summary.trim().slice(0, 110)}
                    {summary.trim().length > 110 ? "…" : ""}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-vermilion border-b border-[var(--rule-strong)] pb-2.5 mb-6">
                № 02{" "}
                <span className="text-paper-3">/ Metrics (optional)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>MRR (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={mrrCents}
                    onChange={(e) => setMrrCents(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Active users</Label>
                  <Input
                    type="number"
                    min={0}
                    value={activeUsers}
                    onChange={(e) => setActiveUsers(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deploys</Label>
                  <Input
                    type="number"
                    min={0}
                    value={deploys}
                    onChange={(e) => setDeploys(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-center justify-between border-t border-[var(--rule-strong)] pt-8">
              <a
                href="/dashboard"
                className="font-body text-[14px] font-medium text-paper-2 hover:text-vermilion border-b border-paper-2 hover:border-vermilion"
              >
                Cancel
              </a>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={post.isPending}
              >
                {post.isPending ? "Posting…" : "Post."}{" "}
                <span aria-hidden>→</span>
              </Button>
            </div>
          </form>
        </div>
      </Wrap>
      <SiteFooter />
    </main>
  );
}
