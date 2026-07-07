import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { History as HistoryIcon, Lock, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/mvp/primitives/button";
import { MvpAppShell } from "@/components/mvp/shell/MvpAppShell";
import { MvpSidebar } from "@/components/mvp/shell/MvpSidebar";
import { MvpNavRenderer } from "@/components/mvp/shell/MvpNavRenderer";
import { MvpFundSelector } from "@/components/mvp/shell/MvpFundSelector";
import { MvpTopbar } from "@/components/mvp/shell/MvpTopbar";
import { PageContainer } from "@/components/mvp/common/PageContainer";
import { PageHeader } from "@/components/mvp/common/PageHeader";
import { DataTableShell } from "@/components/mvp/common/DataTableShell";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import { MvpDataTable, type ColumnDef } from "@/components/mvp/pipeline/MvpDataTable";
import { PipelineCell } from "@/components/mvp/pipeline/PipelineRow";
import { buildMvpNav, ROUTES } from "@/components/mvp/nav/mvpNav";
import { usePageTitle } from "@/components/mvp/common/usePageTitle";

type MemoRow = {
  // `memo_sessions.id` is a serial integer in drizzle/schema.pg.ts.
  id: number;
  sessionId: string;
  fileName: string;
  matchRate: number;
  // superjson decodes server `Date` columns as `Date` instances; legacy callers may pass strings.
  createdAt: Date | string;
  selectedFrameworks: string;
};

function formatCreated(d: Date | string): string {
  return new Date(d).toLocaleDateString();
}

/**
 * Safely render the selectedFrameworks field.
 * The server stores it as a comma-separated string (e.g. "SEC_206_4_7,FINRA_3110")
 * but older rows may have been stored as a JSON array string (e.g. '["SEC","FINRA"]').
 */
function formatFrameworks(value: string | string[] | unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return (parsed as string[]).join(", ");
      } catch {
        // fall through to plain string display
      }
    }
    return trimmed;
  }
  return String(value ?? "");
}

export default function History() {
  usePageTitle("Memo History");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const role: "user" | "admin" = (user?.role ?? "user") as "user" | "admin";
  const nav = buildMvpNav({ id: user?.id ?? "anon", role });

  const list = trpc.history.list.useQuery(undefined, { enabled: Boolean(user) });
  const rows: MemoRow[] = (list.data ?? []) as MemoRow[];

  // Preserve the existing delete behavior from the old History.tsx.
  // history.delete takes { sessionId }, NOT { id } (server/routers.ts:166-176).
  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => list.refetch(),
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const clearAllMutation = trpc.history.clearAll.useMutation({
    onSuccess: () => {
      setShowClearConfirm(false);
      setClearError(null);
      void list.refetch();
    },
    onError: (err) => {
      setClearError(err.message);
    },
  });

  // Preserve the existing open-memo flow: hydrate sessionStorage with the
  // memo JSON before navigating so MemoViewer can render synchronously.
  //
  // history.get is a QUERY (not a mutation) and returns the parsed
  // ICMemoResult directly (server/db.ts:546-562) — there is no `.memoJson`
  // wrapper. The legacy stateful pattern from History.tsx:62-74:
  //
  //   1. setSelectedSessionId triggers history.get.useQuery({ sessionId })
  //   2. useEffect watches the result, hydrates sessionStorage + navigates
  //
  // is the only shape that actually works.
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { data: selectedMemo } = trpc.history.get.useQuery(
    { sessionId: selectedSessionId ?? "" },
    { enabled: Boolean(selectedSessionId) }
  );
  useEffect(() => {
    if (!selectedMemo || !selectedSessionId) return;
    sessionStorage.setItem("simpero_memo", JSON.stringify(selectedMemo.memo));
    sessionStorage.removeItem("simpero_conference");
    navigate(`${ROUTES.memo}/${selectedSessionId}`);
    setSelectedSessionId(null);
  }, [selectedMemo, selectedSessionId, navigate]);
  const openMemo = (sessionId: string) => setSelectedSessionId(sessionId);

  const columns: ColumnDef<MemoRow>[] = [
    {
      key: "fileName",
      header: "Memo",
      render: (r) => (
        <button
          type="button"
          onClick={() => void openMemo(r.sessionId)}
          className="text-left text-sm font-medium text-foreground hover:underline"
        >
          {r.fileName}
        </button>
      ),
    },
    {
      key: "frameworks",
      header: "Frameworks",
      render: (r) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatFrameworks(r.selectedFrameworks)}
        </span>
      ),
    },
    {
      key: "matchRate",
      header: "Verification",
      render: (r) => PipelineCell.MandateFit(r.matchRate, r.fileName),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (r) => <span className="text-xs text-muted-foreground">{formatCreated(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete memo ${r.fileName}`}
          onClick={() => {
            if (confirm(`Delete "${r.fileName}"? This cannot be undone.`)) {
              deleteMutation.mutate({ sessionId: r.sessionId });
            }
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const userInitial = user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;

  // Preserve auth gating from the old History.tsx (lines 87-116 today):
  // unauthenticated users see a Sign-In CTA, not a chrome+empty-table.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-mono animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
        <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-card">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Sign in to view your memos</h2>
          <p className="text-sm text-muted-foreground">
            Your memo history is saved per account. Sign in to access it.
          </p>
        </div>
        <Button asChild>
          <a href={getLoginUrl()}>Sign in</a>
        </Button>
      </div>
    );
  }

  return (
    <MvpAppShell>
      <MvpAppShell.Sidebar>
        <MvpSidebar aria-label="Primary navigation">
          <MvpFundSelector aria-label="Workspace selector" />
          <MvpNavRenderer nav={nav} />
        </MvpSidebar>
      </MvpAppShell.Sidebar>

      <MvpAppShell.Topbar>
        <MvpTopbar>
          <MvpTopbar.Breadcrumb segments={["Deal Flow", "Memo History"]} />
          <MvpTopbar.QuickSearch aria-label="Open quick search" />
          <MvpTopbar.Notifications aria-label="Notifications" />
          <MvpTopbar.Avatar initial={userInitial} name={userName} role={userRoleLabel} aria-label="Account menu" />
        </MvpTopbar>
      </MvpAppShell.Topbar>

      <MvpAppShell.Main>
        <PageContainer>
          <PageHeader
            eyebrow="Deal Flow / Memo History"
            title="Memo History"
            description="All memos this user has saved. Reuse mandate or framework context across deals."
            className="mb-6"
            actions={
              <div className="flex items-center gap-2">
                {rows.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowClearConfirm(true);
                      setClearError(null);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Clear all memo history"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Clear History
                  </Button>
                )}
                <Button onClick={() => navigate(ROUTES.upload)}>+ Add Deal</Button>
              </div>
            }
          />

          {/* Clear history confirmation dialog */}
          {showClearConfirm && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground mb-1">
                Permanently delete all memo history?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                This will permanently delete all {rows.length} memo{rows.length === 1 ? "" : "s"}.
                This cannot be undone.
              </p>
              {clearError && (
                <p className="text-xs text-destructive mb-2">{clearError}</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                >
                  {clearAllMutation.isPending ? "Deleting…" : "Yes, delete all"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowClearConfirm(false);
                    setClearError(null);
                  }}
                  disabled={clearAllMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Query loading state */}
          {list.isLoading && (
            <DataTableShell title="Loading…">
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            </DataTableShell>
          )}

          {/* Query error state */}
          {list.isError && !list.isLoading && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-sm font-medium text-foreground mb-1">
                Failed to load memo history
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {list.error?.message ?? "An unexpected error occurred. Please try again."}
              </p>
              <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {/* Data table — only shown when not loading and no error */}
          {!list.isLoading && !list.isError && (
            <DataTableShell title={`${rows.length} memo${rows.length === 1 ? "" : "s"}`}>
              <MvpDataTable
                aria-label="Memo history"
                rows={rows}
                columns={columns}
                emptyState={
                  <EmptyState
                    icon={HistoryIcon}
                    title="No memos yet"
                    description="Once you complete an analysis on /upload, it appears here."
                    action={{ label: "Start a review", href: ROUTES.upload }}
                  />
                }
              />
            </DataTableShell>
          )}
        </PageContainer>
      </MvpAppShell.Main>
    </MvpAppShell>
  );
}
