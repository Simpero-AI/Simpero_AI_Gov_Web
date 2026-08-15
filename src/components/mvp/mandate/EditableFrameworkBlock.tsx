import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, LayoutTemplate, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRAMEWORK_DEFAULTS, type FrameworkCategory, type FrameworkCriterion, type InvestmentProfile } from "@/data/mandateDefaults";

interface Props {
  profile: InvestmentProfile | null;
  /** Fires whenever local dirty state changes — lets the page-level topbar
   * show a real save-status indicator instead of a fabricated one. `saving`
   * is always false: this block has no persistence path (see the no-save
   * comment below). */
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
}

/** Exported for DealScorecardTab, which reads the same live framework
 * categories to render its (disabled) manual-scoring criteria list — the
 * criteria list itself is real, only the score inputs are inert. */
export function loadCategories(profile: InvestmentProfile | null): FrameworkCategory[] {
  const fw = profile?.weights?.["framework"];
  if (
    fw &&
    typeof fw === "object" &&
    !Array.isArray(fw) &&
    Array.isArray((fw as Record<string, unknown>)["categories"])
  ) {
    const stored = (fw as { categories: FrameworkCategory[] }).categories;
    return stored.map((cat) => {
      const defaultCat = FRAMEWORK_DEFAULTS.find((d) => d.id === cat.id);
      return {
        ...cat,
        criteria: cat.criteria.map((cr) => {
          const defaultCr = defaultCat?.criteria.find((d) => d.id === cr.id);
          return {
            ...cr,
            benchmark: cr.benchmark ?? defaultCr?.benchmark,
            subWeight: cr.subWeight ?? defaultCr?.subWeight,
          };
        }),
      };
    });
  }
  return [];
}

const inp =
  "bg-transparent focus:outline-none border-0 border-b border-transparent focus:border-[color:var(--rev-border-strong)] text-sm text-[color:var(--rev-text-1)]";

export function EditableFrameworkBlock({ profile, onStateChange }: Props) {
  const [isDirty, setIsDirty] = useState(false);
  // No persistence path: this block used to call
  // trpc.investmentProfile.upsert.useMutation() to save the framework
  // weights, same dead endpoint as FirmProfileBlock — it 404s
  // unconditionally (no Express/tRPC server, and no FastAPI write endpoint
  // for scoring-framework weights was ever built; confirmed live). Categories/
  // criteria/weights below stay fully editable (local state + dirty tracking
  // only); Save is disabled for this tab in MandateScorecard's topbar
  // instead of attempting a call that can never succeed.

  const [categories, setCategoriesRaw] = useState<FrameworkCategory[]>(() => loadCategories(profile));
  // Every local edit to `categories` (add/remove/rename category or
  // criterion, weight change) goes through this wrapper so `isDirty` can't
  // drift out of sync with a raw setCategories call.
  const setCategories: typeof setCategoriesRaw = (update) => {
    setIsDirty(true);
    setCategoriesRaw(update);
  };
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const hydratedForProfileRef = useRef<string | null>(null);

  useEffect(() => {
    const key = profile ? String(profile.updatedAt) : "null";
    if (hydratedForProfileRef.current === key) return;
    hydratedForProfileRef.current = key;
    setCategoriesRaw(loadCategories(profile));
    setIsDirty(false);
  }, [profile]);

  useEffect(() => {
    onStateChange?.({ dirty: isDirty, saving: false });
  }, [isDirty, onStateChange]);

  const weightTotal = categories.reduce((sum, c) => sum + c.weight, 0);
  const totalCriteria = categories.reduce((s, c) => s + c.criteria.length, 0);
  const weightOk = Math.abs(weightTotal - 100) <= 1;
  const weightWarn = !weightOk && Math.abs(weightTotal - 100) <= 20;

  const toggleCat = (id: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const updateCategory = (catId: string, patch: Partial<FrameworkCategory>) =>
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, ...patch } : c)));

  const removeCategory = (catId: string) =>
    setCategories((prev) => prev.filter((c) => c.id !== catId));

  const addCategory = () =>
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "New Category", weight: 0, criteria: [] },
    ]);

  const addCriterion = (catId: string) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, criteria: [...c.criteria, { id: crypto.randomUUID(), name: "", benchmark: "", subWeight: 0 }] }
          : c
      )
    );

  const removeCriterion = (catId: string, critId: string) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId && c.criteria.length > 1
          ? { ...c, criteria: c.criteria.filter((cr) => cr.id !== critId) }
          : c
      )
    );

  const updateCriterion = (catId: string, critId: string, patch: Partial<FrameworkCriterion>) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, criteria: c.criteria.map((cr) => (cr.id === critId ? { ...cr, ...patch } : cr)) }
          : c
      )
    );

  const onCancel = () => {
    setCategoriesRaw(loadCategories(profile));
    setIsDirty(false);
  };

  return (
    <div className="space-y-4">
      {/* Category Weight Allocation bar */}
      <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.075em] text-[color:var(--rev-text-6)]">
              Category Weight Allocation
            </span>
            <span className="ml-2 text-xs text-[color:var(--rev-text-7)]">(must sum to 100%)</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-lg px-3 py-1 font-mono text-sm font-semibold tabular-nums",
                weightOk
                  ? "text-[color:var(--rev-success)]"
                  : weightWarn
                  ? "text-[color:var(--rev-warning)]"
                  : "text-[color:var(--rev-danger)]"
              )}
              style={{
                background: weightOk
                  ? "var(--rev-tint-success)"
                  : weightWarn
                  ? "var(--rev-tint-warning)"
                  : "var(--rev-tint-danger)",
              }}
            >
              {weightTotal}% / 100%
            </span>
            <span className="text-xs text-[color:var(--rev-text-6)]">{categories.length} categories · {totalCriteria} criteria</span>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--rev-tint-neutral)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(weightTotal, 100)}%`,
              background: weightOk ? "var(--rev-success)" : weightWarn ? "var(--rev-warning)" : "var(--rev-danger)",
            }}
          />
        </div>
      </div>

      {/* Empty state — shown when no categories have been added yet */}
      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] py-12 text-center">
          <LayoutTemplate className="mb-3 h-8 w-8 text-[color:var(--rev-text-7)]" />
          <p className="mb-1 text-sm font-semibold text-[color:var(--rev-text-2)]">No scoring categories yet</p>
          <p className="mb-5 max-w-xs text-xs text-[color:var(--rev-text-6)]">
            Define the dimensions you evaluate deals on — e.g. Market Opportunity, Team, Financials. Each category gets a weight and a set of scored criteria.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setCategories(
                  FRAMEWORK_DEFAULTS.map((c) => ({ ...c, criteria: c.criteria.map((cr) => ({ ...cr })) }))
                )
              }
              className="flex items-center gap-1.5 rounded-lg bg-[color:var(--rev-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[color:var(--rev-primary-hover)]"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Load starter template
            </button>
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center gap-1.5 rounded-lg border border-[color:var(--rev-border-strong)] px-4 py-2 text-xs font-semibold text-[color:var(--rev-text-4)] transition hover:border-[color:var(--rev-primary)] hover:text-[color:var(--rev-primary)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Start from scratch
            </button>
          </div>
        </div>
      )}

      {/* Category cards */}
      {categories.map((cat) => {
        const isOpen = openCats.has(cat.id);
        const subTotal = cat.criteria.reduce((s, cr) => s + (cr.subWeight ?? 0), 0);
        const subOk = Math.abs(subTotal - 100) <= 1;

        return (
          <div
            key={cat.id}
            className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            {/* Category header */}
            <div className="flex items-center gap-3 border-b border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-5 py-3.5">
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                className="flex-shrink-0 text-[color:var(--rev-text-6)] transition hover:text-[color:var(--rev-text-3)]"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <input
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                className={cn(inp, "flex-1 font-semibold")}
                placeholder="Category name"
              />
              <span
                className={cn(
                  "flex-shrink-0 rounded-lg px-2.5 py-1 font-mono text-[11px]",
                  subOk ? "text-[color:var(--rev-success)]" : "text-[color:var(--rev-warning)]"
                )}
                style={{ background: subOk ? "var(--rev-tint-success)" : "var(--rev-tint-warning)" }}
              >
                sub-wt {subTotal}%
              </span>
              <div className="flex flex-shrink-0 items-center gap-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.05em] text-[color:var(--rev-text-7)]">Weight</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={cat.weight}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
                    if (Number.isFinite(n)) updateCategory(cat.id, { weight: n });
                  }}
                  className="w-16 rounded-lg border border-[color:var(--rev-border-strong)] px-2 py-1 text-right font-mono text-xs text-[color:var(--rev-text-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                />
                <span className="text-xs text-[color:var(--rev-text-6)]">%</span>
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id)}
                  className="ml-1 rounded-lg p-1.5 text-[color:var(--rev-text-6)] transition hover:bg-[color:var(--rev-tint-danger)] hover:text-[color:var(--rev-danger)]"
                  aria-label="Remove category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Criteria table (when expanded) */}
            {isOpen && (
              <div className="px-5 pb-3 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">Criteria</span>
                </div>

                {cat.criteria.length > 0 && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-[color:var(--rev-border-subtle)]">
                    <div className="grid grid-cols-[1fr_80px_1fr_36px] gap-3 border-b border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.6px] text-[color:var(--rev-text-6)]">
                      <span>Criterion</span>
                      <span className="text-center">Sub-wt %</span>
                      <span>Benchmark / Threshold</span>
                      <span />
                    </div>
                    {cat.criteria.map((cr, ri) => (
                      <div
                        key={cr.id}
                        className={cn(
                          "grid grid-cols-[1fr_80px_1fr_36px] items-center gap-3 px-3 py-2.5 hover:bg-[color:var(--rev-tint-neutral-subtle)]",
                          ri < cat.criteria.length - 1 && "border-b border-[color:var(--rev-border-subtle)]"
                        )}
                      >
                        <input
                          value={cr.name}
                          onChange={(e) => updateCriterion(cat.id, cr.id, { name: e.target.value })}
                          placeholder="Criterion label"
                          className="w-full bg-transparent pr-3 text-sm text-[color:var(--rev-text-2)] focus:outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={cr.subWeight ?? ""}
                          onChange={(e) => {
                            const n = Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
                            if (Number.isFinite(n)) updateCriterion(cat.id, cr.id, { subWeight: n });
                          }}
                          className="mx-auto w-14 rounded border border-[color:var(--rev-border-strong)] px-2 py-0.5 text-center text-xs text-[color:var(--rev-text-2)] focus:outline-none focus:ring-1 focus:ring-[color:var(--rev-primary)]"
                        />
                        <input
                          value={cr.benchmark ?? ""}
                          onChange={(e) => updateCriterion(cat.id, cr.id, { benchmark: e.target.value })}
                          placeholder="Benchmark or threshold"
                          className="w-full bg-transparent px-3 text-xs text-[color:var(--rev-text-6)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeCriterion(cat.id, cr.id)}
                          disabled={cat.criteria.length <= 1}
                          className="rounded p-1 text-[color:var(--rev-text-6)] transition hover:bg-[color:var(--rev-tint-danger)] hover:text-[color:var(--rev-danger)] disabled:opacity-30"
                          aria-label="Remove criterion"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addCriterion(cat.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--rev-primary)] transition hover:text-[color:var(--rev-primary-hover)]"
                >
                  <Plus className="w-3.5 h-3.5" />Add Criterion
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add category — only shown when there are already some categories */}
      {categories.length > 0 && (
        <button
          type="button"
          onClick={addCategory}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] py-3.5 text-sm text-[color:var(--rev-text-6)] transition hover:border-[color:var(--rev-primary)] hover:text-[color:var(--rev-primary)]"
        >
          <Plus className="w-4 h-4" />Add Category
        </button>
      )}

    </div>
  );
}
