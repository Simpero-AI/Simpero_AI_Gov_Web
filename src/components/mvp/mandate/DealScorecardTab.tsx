import { useMemo } from "react";
import { Info, Sliders } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DEALS_PIPELINE_QUERY_KEY, fetchDealsPipeline } from "@/api/deals";
import { EmptyState } from "@/components/mvp/common/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/mvp/primitives/select";
import { loadCategories } from "@/components/mvp/mandate/EditableFrameworkBlock";
import type { InvestmentProfile } from "@/data/mandateDefaults";

interface DealScorecardTabProps {
  profile: InvestmentProfile | null;
  dealId: string | null;
  onDealIdChange: (dealId: string | null) => void;
}

/**
 * Manual, human-entered per-criterion 1-5 scoring — distinct from
 * `ScoreCardBlock.tsx`'s `DealScorecardPanel` (AI-computed scoring results
 * shown in Deal Analysis's Scorecard tab). No persistence endpoint exists
 * for manual scores (plan §4c) — the criteria list is real (sourced from
 * the same live framework `EditableFrameworkBlock` manages), but the score
 * inputs are inert, and the Weighted Mandate Fit / By-category rollups are
 * honest empty states rather than a fabricated computation.
 */
export function DealScorecardTab({ profile, dealId, onDealIdChange }: DealScorecardTabProps) {
  const dealsQuery = useQuery({ queryKey: DEALS_PIPELINE_QUERY_KEY, queryFn: fetchDealsPipeline });
  const categories = useMemo(() => loadCategories(profile), [profile]);
  const deals = dealsQuery.data ?? [];
  const selectedDeal = deals.find((d) => d.dealId === dealId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-serif text-lg text-[color:var(--rev-text-1)]">Deal Scorecard</p>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--rev-text-6)]">
            Score a live deal against the framework to see its weighted mandate fit.
          </p>
        </div>
        {/* Always controlled (value="" rather than undefined when nothing is
            selected yet) — avoids Radix's uncontrolled-to-controlled switch
            warning the first time a deal is picked. */}
        <Select value={dealId ?? ""} onValueChange={(v) => onDealIdChange(v)}>
          <SelectTrigger className="min-w-[260px]" aria-label="Select a deal to evaluate">
            <SelectValue placeholder="Select a deal to evaluate…" />
          </SelectTrigger>
          <SelectContent>
            {deals.map((d) => (
              <SelectItem key={d.dealId} value={d.dealId}>
                {d.name} — {d.gpSource}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[12.5px]"
        style={{
          borderColor: "color-mix(in srgb, var(--rev-warning) 30%, white)",
          background: "var(--rev-tint-warning)",
          color: "var(--rev-warning)",
        }}
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Manual per-criterion scoring isn&apos;t wired to a backend yet — the controls below preview the scoring
          shape but won&apos;t save. Weighted Mandate Fit and the by-category breakdown are placeholders until
          scoring is persisted.
        </span>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Sliders}
          title="Scoring framework not configured"
          description="Define categories and criteria in the Scoring Framework tab before scoring a deal manually."
        />
      ) : !selectedDeal ? (
        <EmptyState
          icon={Sliders}
          title="No deal selected"
          description="Select a deal above to preview scoring it against your framework."
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="overflow-hidden rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <div className="flex items-center gap-3 border-b border-[color:var(--rev-border-subtle)] bg-[color:var(--rev-tint-neutral-subtle)] px-[18px] py-3.5">
                  <span className="flex-1 text-sm font-semibold text-[color:var(--rev-text-3)]">{cat.name}</span>
                  <span className="font-mono text-[11px] text-[color:var(--rev-text-7)]">wt {cat.weight}%</span>
                </div>
                {cat.criteria.map((cr) => (
                  <div
                    key={cr.id}
                    className="flex items-center gap-4 border-b border-[color:var(--rev-border-subtle)] px-[18px] py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-[color:var(--rev-text-2)]">{cr.name || "Untitled criterion"}</p>
                      {cr.benchmark ? (
                        <p className="mt-0.5 truncate text-xs text-[color:var(--rev-text-7)]">{cr.benchmark}</p>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      role="group"
                      aria-label={`Score for ${cr.name || "criterion"} — not yet available`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled
                          title="Manual scoring isn't wired to a backend yet"
                          aria-label={`Score ${n} of 5`}
                          className="h-[22px] w-[22px] rounded-full border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral)] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      ))}
                      <span className="w-6 text-right font-mono text-xs text-[color:var(--rev-text-7)]">—</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-[22px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:sticky lg:top-0">
            <p className="font-mono text-[11px] uppercase tracking-[1px] text-[color:var(--rev-text-6)]">
              Weighted Mandate Fit
            </p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-[46px] font-semibold leading-none text-[color:var(--rev-text-7)]">—</span>
              <span className="font-mono text-lg text-[color:var(--rev-text-7)]">/100</span>
            </div>
            <span className="mt-3 inline-block rounded-full bg-[color:var(--rev-tint-neutral)] px-3.5 py-1.5 text-[13px] font-semibold text-[color:var(--rev-text-6)]">
              Not yet scored
            </span>
            <div className="my-5 h-px bg-[color:var(--rev-border-subtle)]" />
            <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.6px] text-[color:var(--rev-text-7)]">
              By category
            </p>
            <div className="flex flex-col gap-3">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-1 flex justify-between text-[12.5px] text-[color:var(--rev-text-5)]">
                    <span>{cat.name}</span>
                    <span className="font-mono text-[color:var(--rev-text-7)]">—</span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded bg-[color:var(--rev-tint-neutral)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
