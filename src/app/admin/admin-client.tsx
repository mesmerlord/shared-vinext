"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";
import type {
  ConfigKey,
} from "@/server/config";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wrap } from "@/components/wrap";
import { PageLockup } from "@/components/page-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Tab = "config" | "jobs";
type ValueKind = "boolean" | "number" | "string" | "json";

function detectKind(value: unknown): ValueKind {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "json";
}

function namespaceFor(key: string): string {
  return key.split(".").slice(0, 1).join(".");
}

export function AdminClient() {
  const [tab, setTab] = useState<Tab>("config");

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <Wrap>
        <PageLockup
          kickerNumber="07"
          kickerName="Admin"
          title="Tune the"
          accentWord="board."
          deck={
            <>
              Velocity window, featured cap, kill-switch, retry queue. Every
              change is logged.
            </>
          }
          meta={
            <>
              Admin only · <b className="text-paper font-semibold">role</b>
            </>
          }
        />

        {/* Tab strip */}
        <div className="flex gap-6 border-b border-paper mt-4">
          <TabButton active={tab === "config"} onClick={() => setTab("config")}>
            Config
          </TabButton>
          <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")}>
            Crawl jobs
          </TabButton>
        </div>

        <div className="py-12">
          {tab === "config" ? <ConfigPanel /> : <JobsPanel />}
        </div>
      </Wrap>
      <SiteFooter />
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "font-body text-[14px] font-semibold py-3 -mb-px border-b-2 " +
        (active
          ? "text-vermilion border-vermilion"
          : "text-paper-2 border-transparent hover:text-paper")
      }
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Config panel
// ---------------------------------------------------------------------------

function ConfigPanel() {
  const utils = trpc.useUtils();
  const list = trpc.config.list.useQuery();
  const setMutation = trpc.config.set.useMutation({
    onSuccess: () => {
      void utils.config.list.invalidate();
    },
  });
  const resetMutation = trpc.config.reset.useMutation({
    onSuccess: () => {
      void utils.config.list.invalidate();
    },
  });
  const invalidateMutation = trpc.config.invalidateCache.useMutation();

  const grouped = useMemo(() => {
    const rows = list.data ?? [];
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const ns = namespaceFor(row.key);
      const arr = map.get(ns) ?? [];
      arr.push(row);
      map.set(ns, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [list.data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 max-w-[64ch]">
          Saved values cache for{" "}
          <b className="text-paper">30 seconds per worker process</b>. Clear
          cache propagates immediately on the isolate handling that request;
          others self-heal.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => invalidateMutation.mutate()}
          disabled={invalidateMutation.isPending}
        >
          {invalidateMutation.isPending ? "Clearing…" : "Clear cache"}
        </Button>
      </div>

      {list.isLoading ? (
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-paper-3">
          Reading the config.
        </p>
      ) : (
        <div className="space-y-12">
          {grouped.map(([ns, rows]) => (
            <section key={ns}>
              <h3 className="font-display italic font-black text-[20px] text-paper mb-4">
                {ns}
              </h3>
              <ul className="border-y-2 border-paper list-none p-0 m-0">
                {rows.map((row) => (
                  <ConfigRow
                    key={row.key}
                    keyName={row.key as ConfigKey}
                    value={row.value}
                    defaultValue={row.defaultValue}
                    description={row.description}
                    isDefault={row.isDefault}
                    onSave={(val) =>
                      setMutation.mutateAsync({
                        key: row.key as ConfigKey,
                        value: val,
                      })
                    }
                    onReset={() =>
                      resetMutation.mutateAsync({ key: row.key as ConfigKey })
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  keyName,
  value,
  defaultValue,
  description,
  isDefault,
  onSave,
  onReset,
}: {
  keyName: ConfigKey;
  value: unknown;
  defaultValue: unknown;
  description: string | null;
  isDefault: boolean;
  onSave: (val: unknown) => Promise<unknown>;
  onReset: () => Promise<unknown>;
}) {
  const kind = detectKind(defaultValue);
  const [draft, setDraft] = useState<string>(() =>
    kind === "string" ? String(value ?? "") : JSON.stringify(value),
  );
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function parse(): unknown {
    if (kind === "boolean") return draft === "true";
    if (kind === "number") {
      const n = parseFloat(draft);
      if (!Number.isFinite(n)) throw new Error("Not a number");
      return n;
    }
    if (kind === "string") return draft;
    return JSON.parse(draft);
  }

  async function save() {
    setPending(true);
    setErr(null);
    try {
      const v = parse();
      await onSave(v);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 px-3 py-[20px] border-b border-[var(--rule)] last:border-b-0 [font-variant-numeric:tabular-nums]">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[13px] text-paper font-medium">
            {keyName}
          </span>
          {!isDefault && (
            <Badge variant="hot">· custom ·</Badge>
          )}
        </div>
        {description ? (
          <p className="font-body text-[13px] text-paper-2 mb-2 max-w-[64ch]">
            {description}
          </p>
        ) : null}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
          Default:{" "}
          <span className="text-paper-2">{JSON.stringify(defaultValue)}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2 md:items-end">
        <div className="flex items-center gap-2">
          {kind === "boolean" ? (
            <select
              value={String(value)}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-ink-3 text-paper border border-[var(--rule-strong)] px-3 py-2 font-mono text-[13px] focus:outline-none focus:border-vermilion"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-[180px] md:w-[240px]"
            />
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={save}
            disabled={pending}
          >
            {pending ? "…" : "Save"}
          </Button>
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void onReset()}
            >
              Reset
            </Button>
          )}
        </div>
        {err ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-vermilion">
            — ERR · {err}
          </p>
        ) : null}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Jobs panel
// ---------------------------------------------------------------------------

function JobsPanel() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "queued" | "running" | "done" | "failed"
  >("failed");
  const jobs = trpc.admin.listCrawlJobs.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 80,
  });
  const retry = trpc.admin.retryCrawlJob.useMutation({
    onSuccess: () => {
      void utils.admin.listCrawlJobs.invalidate();
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3 max-w-[64ch]">
          DLQ inspector. Failed jobs sit here until you retry — DLQ messages
          are no-op-acked by default.
        </p>
        <div className="flex gap-2">
          {(["failed", "queued", "running", "done", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                "font-mono uppercase tracking-[0.2em] text-[11px] px-3 py-[6px] rounded-full border transition-colors " +
                (statusFilter === s
                  ? "bg-vermilion border-vermilion text-ink font-bold"
                  : "border-[var(--rule-strong)] text-paper-2 hover:border-paper")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {jobs.isLoading ? (
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-paper-3">
          Reading jobs.
        </p>
      ) : (jobs.data ?? []).length === 0 ? (
        <div className="border-y border-[var(--rule-strong)] py-16 text-center">
          <p className="font-display italic font-medium text-[24px] text-paper">
            &ldquo;Quiet queue.&rdquo;
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-paper-3">
            No {statusFilter} jobs.
          </p>
        </div>
      ) : (
        <ul className="border-y-2 border-paper list-none p-0 m-0 [font-variant-numeric:tabular-nums]">
          {(jobs.data ?? []).map((j) => (
            <li
              key={j.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-3 py-[18px] border-b border-[var(--rule)] last:border-b-0 items-center"
            >
              <Badge
                variant={
                  j.status === "failed"
                    ? "hot"
                    : j.status === "running"
                      ? "status"
                      : "stack"
                }
              >
                · {j.status} ·
              </Badge>
              <div>
                <div className="font-mono text-[12px] text-paper">
                  {j.productName ?? "—"} ·{" "}
                  <b className="text-vermilion font-medium">{j.kind}</b>
                </div>
                {j.lastError ? (
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-vermilion mt-1">
                    — ERR · {j.lastError.slice(0, 200)}
                  </div>
                ) : null}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                attempt {j.attempt}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-3">
                {formatRelative(j.queuedAt)}
              </span>
              {j.status === "failed" || j.status === "queued" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => retry.mutate({ jobId: j.id })}
                >
                  Retry →
                </Button>
              ) : (
                <span aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(d: Date | string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const delta = (Date.now() - date.getTime()) / 1000;
  if (delta < 3600) return `${Math.round(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.round(delta / 3600)} hr ago`;
  return `${Math.round(delta / 86400)} d ago`;
}
