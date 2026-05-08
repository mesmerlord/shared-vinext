"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/lib/auth-context";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { PageLockup } from "@/components/page-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError, FormErrorCard } from "@/components/form-error";
import { StackMultiSelect, STACK_SUGGESTIONS } from "@/components/multiselect";

interface FieldErrors {
  name?: string;
  tagline?: string;
  homepageUrl?: string;
  githubRepo?: string;
}

export function SubmitClient() {
  const router = useRouter();
  const { user, isLoading, openLogin } = useAuth();

  // Auth gate — redirect to /signin if not auth'd. Open the modal too as
  // courtesy. (idea.md says auth-gated unless admin sets submit.allow_anon=true;
  // we honor the default here.)
  useEffect(() => {
    if (!isLoading && !user) {
      openLogin();
      router.push(`/signin?next=${encodeURIComponent("/submit")}`);
    }
  }, [user, isLoading, openLogin, router]);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [stackTags, setStackTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = trpc.products.submit.useMutation({
    onSuccess: (res) => {
      router.push(`/p/${res.slug}`);
    },
  });

  function validate(): boolean {
    const e: FieldErrors = {};
    if (name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (tagline.trim().length < 8)
      e.tagline = "Tagline must be at least 8 characters.";
    try {
      const url = new URL(homepageUrl);
      if (!/^https?:$/.test(url.protocol)) {
        e.homepageUrl = "URL must start with http:// or https://";
      }
    } catch {
      e.homepageUrl = "Not a valid URL.";
    }
    if (githubRepo.trim().length > 0 && !/^[\w.-]+\/[\w.-]+$/.test(githubRepo.trim())) {
      e.githubRepo = "Expected `org/repo` shape.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    submit.mutate({
      name: name.trim(),
      tagline: tagline.trim(),
      homepageUrl: homepageUrl.trim(),
      githubRepo: githubRepo.trim() || null,
      stackTags,
    });
  }

  if (isLoading || !user) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <Wrap>
          <div className="py-24 font-mono text-[12px] uppercase tracking-[0.22em] text-paper-3">
            Reading the board.
          </div>
        </Wrap>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <Wrap>
        <PageLockup
          kickerNumber="01"
          kickerName="Claim a project"
          title="Get on the"
          accentWord="board."
          deck={
            <>
              Drop a public GitHub repo URL and your homepage. We crawl
              releases &amp; the og:image. You change nothing.
            </>
          }
          meta={
            <>
              Three fields · <b className="text-paper font-semibold">~30 sec</b>
            </>
          }
        />

        <div className="max-w-form mx-auto py-10 md:py-16">
          {submit.isError ? (
            <FormErrorCard
              title="The submit didn't take."
              body={submit.error?.message ?? "Try again. If it persists, write us."}
            />
          ) : null}

          <form onSubmit={onSubmit} className="space-y-10">
            <Section number="01" name="Project">
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Linkfolio"
                  maxLength={80}
                  required
                />
                <FormError message={errors.name} />
              </Field>

              <Field label="Tagline" hint="Plain English. One line. No SaaS jargon.">
                <Textarea
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="A link-in-bio for engineers — Markdown, RSS, and a deploy log instead of pastel cards."
                  maxLength={200}
                  className="min-h-[80px]"
                  required
                />
                <FormError message={errors.tagline} />
              </Field>
            </Section>

            <Section number="02" name="Sources">
              <Field
                label="Homepage URL"
                hint="We'll fetch og:image and og:title."
              >
                <Input
                  type="url"
                  value={homepageUrl}
                  onChange={(e) => setHomepageUrl(e.target.value)}
                  placeholder="https://yourproject.dev"
                  required
                />
                <FormError message={errors.homepageUrl} />
              </Field>

              <Field
                label="GitHub repo"
                hint="org/repo. Optional — leave blank if you don't track releases on GitHub."
              >
                <Input
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="maevc/linkfolio"
                />
                <FormError message={errors.githubRepo} />
              </Field>
            </Section>

            <Section number="03" name="Stack">
              <Field
                label="Stack tags"
                hint="The tech you actually shipped on this week. The first 5 show on the board."
              >
                <StackMultiSelect
                  value={stackTags}
                  onChange={setStackTags}
                  suggestions={STACK_SUGGESTIONS}
                  max={10}
                />
              </Field>
            </Section>

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
                disabled={submit.isPending}
              >
                {submit.isPending ? "Crawling…" : "Claim."}{" "}
                <span aria-hidden>→</span>
              </Button>
            </div>
          </form>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3">
            By claiming, you confirm you own this repo. We&apos;ll crawl public
            releases only.
          </p>
        </div>
      </Wrap>
      <SiteFooter />
    </main>
  );
}

function Section({
  number,
  name,
  children,
}: {
  number: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-vermilion border-b border-[var(--rule-strong)] pb-2.5 mb-6">
        № {number}{" "}
        <span className="text-paper-3">/ {name}</span>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? (
        <p className="font-body text-[12px] text-paper-3">{hint}</p>
      ) : null}
    </div>
  );
}
