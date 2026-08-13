import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, LayoutTemplate, Plus, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { INVESTMENT_PROFILE_QUERY_KEY } from "@/api/investmentProfile";
import { toast } from "@/components/mvp/primitives/sonner";
import { cn } from "@/lib/utils";
import { FRAMEWORK_DEFAULTS, type FrameworkCategory, type FrameworkCriterion, type InvestmentProfile } from "@/data/mandateDefaults";

interface Props {
  profile: InvestmentProfile | null;
  saveRef?: React.MutableRefObject<(() => void) | null>;
  /** Fires whenever local dirty/saving state changes — lets the page-level
   * topbar show a real save-status indicator instead of a fabricated one. */
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

const inp = "bg-transparent focus:outline-none border-0 border-b border-transparent focus:border-gray-300 text-sm text-gray-900";

export function EditableFrameworkBlock({ profile, saveRef, onStateChange }: Props) {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const [isDirty, setIsDirty] = useState(false);
  const upsertMutation = trpc.investmentProfile.upsert.useMutation({
    onSuccess: async () => {
      // Invalidate both caches: the trpc-backed write still lives here, but
      // readers (MandateScorecard, MvpFundSelector) migrated to apiFetch.
      await Promise.all([
        utils.investmentProfile.get.invalidate(),
        queryClient.invalidateQueries({ queryKey: INVESTMENT_PROFILE_QUERY_KEY }),
      ]);
      setIsDirty(false);
      toast.success("Framework saved.");
    },
    onError: (err) => toast.error(err.message),
  });

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
    onStateChange?.({ dirty: isDirty, saving: upsertMutation.isPending });
  }, [isDirty, upsertMutation.isPending, onStateChange]);

  const weightTotal = categories.reduce((sum, c) => sum + c.weight, 0);
  const totalCriteria = categories.reduce((s, c) => s + c.criteria.length, 0);
  const hasEmptyCriteria = categories.some((c) => c.criteria.some((cr) => cr.name.trim() === ""));
  const weightOk = Math.abs(weightTotal - 100) <= 1;
  const weightWarn = !weightOk && Math.abs(weightTotal - 100) <= 20;
  const canSave = weightOk && !hasEmptyCriteria;

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

  const doSave = useCallback(() => {
    upsertMutation.mutate({ weights: { framework: { categories } } });
  }, [categories, upsertMutation]);

  useEffect(() => {
    if (saveRef) saveRef.current = canSave ? doSave : null;
  }, [saveRef, canSave, doSave]);

  return (
    <div className="space-y-4">
      {/* Category Weight Allocation bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-semibold text-gray-900">Category Weight Allocation</span>
            <span className="text-xs text-gray-400 ml-2">(must sum to 100%)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              weightOk ? "text-emerald-600" : weightWarn ? "text-amber-600" : "text-red-600"
            )}>
              {weightTotal}% / 100%
            </span>
            <span className="text-xs text-gray-400">{categories.length} categories · {totalCriteria} criteria</span>
          </div>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              weightOk ? "bg-emerald-500" : weightWarn ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${Math.min(weightTotal, 100)}%` }}
          />
        </div>
      </div>

      {/* Empty state — shown when no categories have been added yet */}
      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <LayoutTemplate className="w-8 h-8 mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700 mb-1">No scoring categories yet</p>
          <p className="text-xs text-gray-400 max-w-xs mb-5">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Load starter template
            </button>
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 transition"
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
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-xs text-gray-500">Weight</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={cat.weight}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
                    if (Number.isFinite(n)) updateCategory(cat.id, { weight: n });
                  }}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">%</span>
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition ml-1"
                  aria-label="Remove category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Criteria table (when expanded) */}
            {isOpen && (
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Criteria</span>
                  <span className={cn("text-xs font-semibold", subOk ? "text-emerald-600" : "text-amber-600")}>
                    Sub-weights: {subTotal}%
                  </span>
                </div>

                {cat.criteria.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                    <div className="grid grid-cols-[1fr_80px_1fr_36px] text-[10px] text-gray-500 uppercase tracking-wide font-semibold px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span>Criterion</span>
                      <span className="text-center">Sub-wt %</span>
                      <span>Benchmark / Threshold</span>
                      <span />
                    </div>
                    {cat.criteria.map((cr, ri) => (
                      <div
                        key={cr.id}
                        className={cn(
                          "grid grid-cols-[1fr_80px_1fr_36px] items-center px-3 py-2.5 hover:bg-gray-50",
                          ri < cat.criteria.length - 1 && "border-b border-gray-100"
                        )}
                      >
                        <input
                          value={cr.name}
                          onChange={(e) => updateCriterion(cat.id, cr.id, { name: e.target.value })}
                          placeholder="Criterion label"
                          className="bg-transparent text-sm text-gray-800 focus:outline-none w-full pr-3"
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
                          className="w-14 mx-auto border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          value={cr.benchmark ?? ""}
                          onChange={(e) => updateCriterion(cat.id, cr.id, { benchmark: e.target.value })}
                          placeholder="Benchmark or threshold"
                          className="bg-transparent text-xs text-gray-500 focus:outline-none w-full px-3"
                        />
                        <button
                          type="button"
                          onClick={() => removeCriterion(cat.id, cr.id)}
                          disabled={cat.criteria.length <= 1}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-30"
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
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
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
          className="w-full py-3.5 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-sm text-gray-400 hover:text-blue-600 transition flex items-center justify-center gap-2 bg-white"
        >
          <Plus className="w-4 h-4" />Add Category
        </button>
      )}

    </div>
  );
}
