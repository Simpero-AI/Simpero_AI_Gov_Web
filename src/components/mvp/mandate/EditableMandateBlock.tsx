import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronUp, DollarSign, Target,
  CheckCircle2, XCircle, Leaf, FileText, Plus, X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { INVESTMENT_PROFILE_QUERY_KEY } from "@/api/investmentProfile";
import { toast } from "@/components/mvp/primitives/sonner";
import { Textarea } from "@/components/mvp/primitives/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/mvp/primitives/select";
import {
  MANDATE_DEFAULTS,
  SECTOR_PRESETS,
  STAGE_PRESETS,
  GEOGRAPHY_PRESETS,
  DEALTYPE_PRESETS,
  ASSETCLASS_PRESETS,
  type InvestmentProfile,
} from "@/data/mandateDefaults";
import { cn } from "@/lib/utils";

interface Props {
  profile: InvestmentProfile | null;
  saveRef?: React.MutableRefObject<(() => void) | null>;
  /** Fires whenever local dirty/saving state changes — lets the page-level
   * topbar show a real save-status indicator instead of a fabricated one. */
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
}

function getString(mandate: Record<string, unknown>, key: string, fallback: string): string {
  const v = mandate[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function getStringArray(mandate: Record<string, unknown>, key: string, fallback: readonly string[]): string[] {
  const v = mandate[key];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  return [...fallback];
}

function getNumber(mandate: Record<string, unknown>, key: string, fallback: number): number {
  const v = mandate[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function EditableMandateBlock({ profile, saveRef, onStateChange }: Props) {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const upsertMutation = trpc.investmentProfile.upsert.useMutation({
    onSuccess: async () => {
      // Invalidate both caches: the trpc-backed write still lives here, but
      // readers (MandateScorecard, MvpFundSelector) migrated to apiFetch.
      await Promise.all([
        utils.investmentProfile.get.invalidate(),
        queryClient.invalidateQueries({ queryKey: INVESTMENT_PROFILE_QUERY_KEY }),
      ]);
      setIsDirty(false);
      toast.success("Mandate saved.");
    },
    onError: (err) => toast.error(err.message),
  });

  const hydratedRef = useRef<string | null>(null);
  // Guard: once the form has been hydrated from the profile, never overwrite
  // user edits even if the profile query refetches in the background.
  const hasHydrated = useRef(false);
  // Dirty state — set to true on any field change, false after successful save.
  const [isDirty, setIsDirty] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["parameters", "financial", "mustHaves", "dealBreakers", "esg", "notes"])
  );

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const m = profile?.mandate ?? {};
  // Old free-text `checkSize` blobs (pre-migration) intentionally aren't parsed —
  // fall back to the numeric defaults, same as any other missing field.
  const [checkMin, setCheckMin] = useState(() => getNumber(m, "checkMin", MANDATE_DEFAULTS.checkMinK));
  const [checkMax, setCheckMax] = useState(() => getNumber(m, "checkMax", MANDATE_DEFAULTS.checkMaxK));
  // Financial Thresholds — mockup's 5 numeric fields, replacing the old
  // free-text Revenue Band/EBITDA/Gross Margin/Ownership/Max Entry Valuation.
  const [minMrr, setMinMrr] = useState(() => getNumber(m, "minMrr", MANDATE_DEFAULTS.minMrr));
  const [minMomGrowth, setMinMomGrowth] = useState(() => getNumber(m, "minMomGrowth", MANDATE_DEFAULTS.minMomGrowth));
  const [maxBurnMultiple, setMaxBurnMultiple] = useState(() => getNumber(m, "maxBurnMultiple", MANDATE_DEFAULTS.maxBurnMultiple));
  const [minRunway, setMinRunway] = useState(() => getNumber(m, "minRunway", MANDATE_DEFAULTS.minRunway));
  const [maxValMultiple, setMaxValMultiple] = useState(() => getNumber(m, "maxValMultiple", MANDATE_DEFAULTS.maxValMultiple));
  // holdPeriod/targetReturn aren't part of the mockup's Financial Thresholds card,
  // but are real fields read by FirmProfileBlock/Deals.tsx/MandateBanner — kept
  // editable here (appended below the mockup's 5 fields) rather than dropped.
  const [holdPeriod, setHoldPeriod] = useState(() => getString(m, "holdPeriod", MANDATE_DEFAULTS.holdPeriod));
  const [targetReturn, setTargetReturn] = useState(() => getString(m, "targetReturn", MANDATE_DEFAULTS.targetReturn));
  const [sectorLabels, setSectorLabels] = useState<string[]>(() =>
    getStringArray(m, "mandateSectorLabels", MANDATE_DEFAULTS.mandateSectorLabels)
  );
  const [geoLabels, setGeoLabels] = useState<string[]>(() =>
    getStringArray(m, "mandateGeoLabels", MANDATE_DEFAULTS.mandateGeoLabels)
  );
  const [investmentStages, setInvestmentStages] = useState<string[]>(() =>
    getStringArray(m, "investmentStages", MANDATE_DEFAULTS.investmentStages)
  );
  const [dealTypeLabels, setDealTypeLabels] = useState<string[]>(() =>
    getStringArray(m, "dealTypeLabels", [])
  );
  const [assetClassLabels, setAssetClassLabels] = useState<string[]>(() =>
    getStringArray(m, "assetClassLabels", [])
  );
  const [mustHaves, setMustHaves] = useState<string[]>(() =>
    getStringArray(m, "mustHaves", MANDATE_DEFAULTS.mustHaves)
  );
  const [dealBreakers, setDealBreakers] = useState<string[]>(() =>
    getStringArray(m, "dealBreakers", MANDATE_DEFAULTS.dealBreakers)
  );
  const [esgCriteria, setEsgCriteria] = useState<string[]>(() =>
    getStringArray(m, "esgCriteria", MANDATE_DEFAULTS.esgCriteria)
  );
  const [specialNotes, setSpecialNotes] = useState(() =>
    getString(m, "specialNotes", MANDATE_DEFAULTS.specialNotes)
  );

  // Inline add inputs — Target Sectors/Investment Stages/Geographies now use
  // TagField's own preset-dropdown-or-custom-input state (see TagField below),
  // so only the plain-text BulletList fields need ephemeral input state here.
  const [newMustHave, setNewMustHave] = useState("");
  const [newDealBreaker, setNewDealBreaker] = useState("");
  const [newEsg, setNewEsg] = useState("");

  useEffect(() => {
    // Only hydrate once — background refetches must not overwrite user edits.
    if (hasHydrated.current) return;
    const key = profile ? String(profile.updatedAt) : "null";
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;
    hasHydrated.current = true;
    const mn = profile?.mandate ?? {};
    setCheckMin(getNumber(mn, "checkMin", MANDATE_DEFAULTS.checkMinK));
    setCheckMax(getNumber(mn, "checkMax", MANDATE_DEFAULTS.checkMaxK));
    setMinMrr(getNumber(mn, "minMrr", MANDATE_DEFAULTS.minMrr));
    setMinMomGrowth(getNumber(mn, "minMomGrowth", MANDATE_DEFAULTS.minMomGrowth));
    setMaxBurnMultiple(getNumber(mn, "maxBurnMultiple", MANDATE_DEFAULTS.maxBurnMultiple));
    setMinRunway(getNumber(mn, "minRunway", MANDATE_DEFAULTS.minRunway));
    setMaxValMultiple(getNumber(mn, "maxValMultiple", MANDATE_DEFAULTS.maxValMultiple));
    setHoldPeriod(getString(mn, "holdPeriod", MANDATE_DEFAULTS.holdPeriod));
    setTargetReturn(getString(mn, "targetReturn", MANDATE_DEFAULTS.targetReturn));
    setSectorLabels(getStringArray(mn, "mandateSectorLabels", MANDATE_DEFAULTS.mandateSectorLabels));
    setGeoLabels(getStringArray(mn, "mandateGeoLabels", MANDATE_DEFAULTS.mandateGeoLabels));
    setInvestmentStages(getStringArray(mn, "investmentStages", MANDATE_DEFAULTS.investmentStages));
    setDealTypeLabels(getStringArray(mn, "dealTypeLabels", []));
    setAssetClassLabels(getStringArray(mn, "assetClassLabels", []));
    setMustHaves(getStringArray(mn, "mustHaves", MANDATE_DEFAULTS.mustHaves));
    setDealBreakers(getStringArray(mn, "dealBreakers", MANDATE_DEFAULTS.dealBreakers));
    setEsgCriteria(getStringArray(mn, "esgCriteria", MANDATE_DEFAULTS.esgCriteria));
    setSpecialNotes(getString(mn, "specialNotes", MANDATE_DEFAULTS.specialNotes));
  }, [profile]);

  const doSave = useCallback(() => {
    upsertMutation.mutate({
      mandate: {
        checkMin, checkMax,
        minMrr, minMomGrowth, maxBurnMultiple, minRunway, maxValMultiple,
        holdPeriod, targetReturn,
        mandateSectorLabels: sectorLabels,
        mandateGeoLabels: geoLabels,
        investmentStages, dealTypeLabels, assetClassLabels,
        mustHaves, dealBreakers, esgCriteria, specialNotes,
      },
    });
  }, [
    checkMin, checkMax, minMrr, minMomGrowth, maxBurnMultiple, minRunway, maxValMultiple,
    holdPeriod, targetReturn, sectorLabels, geoLabels, investmentStages,
    dealTypeLabels, assetClassLabels,
    mustHaves, dealBreakers, esgCriteria, specialNotes, upsertMutation,
  ]);

  useEffect(() => {
    if (saveRef) saveRef.current = doSave;
  }, [saveRef, doSave]);

  useEffect(() => {
    onStateChange?.({ dirty: isDirty, saving: upsertMutation.isPending });
  }, [isDirty, upsertMutation.isPending, onStateChange]);

  // Show native browser "leave page?" dialog when user has unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    if (isDirty) {
      window.addEventListener("beforeunload", handler);
    }
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Helper: mark field dirty on change
  const markDirty = () => setIsDirty(true);

  const addToList = (
    val: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setNew?: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const t = val.trim();
    if (t && !list.includes(t)) { setList((p) => [...p, t]); setIsDirty(true); }
    setNew?.("");
  };

  const removeFromList = (
    item: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => { setList((p) => p.filter((x) => x !== item)); setIsDirty(true); };

  // Financial Thresholds — mockup's 5 numeric fields (lines 4309-4315 of the
  // source mockup), each a labeled row with a small centered number input
  // and a unit suffix.
  const thresholdFields: { key: string; label: string; value: number; set: (n: number) => void; unit: string }[] = [
    { key: "minMrr", label: "Min MRR/ARR at Investment ($K)", value: minMrr, set: setMinMrr, unit: "$K" },
    { key: "minMomGrowth", label: "Min Month-over-Month Growth", value: minMomGrowth, set: setMinMomGrowth, unit: "%MoM" },
    { key: "maxBurnMultiple", label: "Max Burn Multiple", value: maxBurnMultiple, set: setMaxBurnMultiple, unit: "×" },
    { key: "minRunway", label: "Min Runway Post-Raise (months)", value: minRunway, set: setMinRunway, unit: "mo" },
    { key: "maxValMultiple", label: "Max Pre-Money Valuation", value: maxValMultiple, set: setMaxValMultiple, unit: "×ARR" },
  ];

  return (
    <div className="space-y-4">
      {/* Mockup's mtBuilder 2-column grid (1.5fr/1fr): left = Investment
          Parameters + Must-Have Criteria, right = Financial Thresholds +
          Deal-Breaker Criteria. */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* 1 — Investment Parameters (was "Target Universe"; Check Size
              Range moved in here from Financial Thresholds to match the
              mockup's placement). */}
          <SectionCard
            id="parameters"
            icon={<Target className="w-4 h-4 text-[color:var(--rev-primary)]" />}
            title="Investment Parameters"
            badge={`${sectorLabels.length} sectors · ${geoLabels.length} geos · ${dealTypeLabels.length} deal types · ${assetClassLabels.length} asset classes`}
            open={openSections.has("parameters")}
            onToggle={() => toggleSection("parameters")}
          >
            <div className="grid grid-cols-2 gap-x-5 gap-y-5 pt-4">
              <TagField
                label="Investment Stage"
                items={investmentStages}
                presets={STAGE_PRESETS}
                addLabel="stage"
                onAdd={(value) => addToList(value, investmentStages, setInvestmentStages)}
                onRemove={(item) => removeFromList(item, setInvestmentStages)}
              />
              <TagField
                label="Geographies"
                items={geoLabels}
                presets={GEOGRAPHY_PRESETS}
                addLabel="geography"
                onAdd={(value) => addToList(value, geoLabels, setGeoLabels)}
                onRemove={(item) => removeFromList(item, setGeoLabels)}
              />
              <TagField
                label="Target Sectors"
                items={sectorLabels}
                presets={SECTOR_PRESETS}
                addLabel="sector"
                onAdd={(value) => addToList(value, sectorLabels, setSectorLabels)}
                onRemove={(item) => removeFromList(item, setSectorLabels)}
              />
              <TagField
                label="Deal Types"
                items={dealTypeLabels}
                presets={DEALTYPE_PRESETS}
                addLabel="deal type"
                onAdd={(value) => addToList(value, dealTypeLabels, setDealTypeLabels)}
                onRemove={(item) => removeFromList(item, setDealTypeLabels)}
              />
              <TagField
                label="Asset Classes"
                items={assetClassLabels}
                presets={ASSETCLASS_PRESETS}
                addLabel="asset class"
                onAdd={(value) => addToList(value, assetClassLabels, setAssetClassLabels)}
                onRemove={(item) => removeFromList(item, setAssetClassLabels)}
              />
              <div>
                <p className="mb-2 text-xs font-semibold text-[color:var(--rev-text-3)]">Check Size Range</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="whitespace-nowrap rounded-lg bg-[color:var(--rev-primary)] px-2.5 py-1.5 font-mono text-xs font-semibold text-white">
                    ${checkMin}K–${checkMax}K
                  </span>
                  <input
                    type="number"
                    value={checkMin}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) { setCheckMin(n); markDirty(); }
                    }}
                    className="w-[52px] rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-1.5 py-1 text-center text-sm text-[color:var(--rev-text-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                  />
                  <span className="text-[color:var(--rev-text-7)]">–</span>
                  <input
                    type="number"
                    value={checkMax}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) { setCheckMax(n); markDirty(); }
                    }}
                    className="w-[52px] rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-1.5 py-1 text-center text-sm text-[color:var(--rev-text-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                  />
                  <span className="font-mono text-[11px] text-[color:var(--rev-text-6)]">$K</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 2 — Must-Have Criteria */}
          <SectionCard
            id="mustHaves"
            icon={<CheckCircle2 className="w-4 h-4 text-[color:var(--rev-success)]" />}
            title="Must-Have Criteria"
            badge={String(mustHaves.length)}
            badgeColor="emerald"
            open={openSections.has("mustHaves")}
            onToggle={() => toggleSection("mustHaves")}
          >
            <div className="pt-3">
              <p className="mb-3 text-xs text-[color:var(--rev-text-6)]">Non-negotiable criteria every deal must satisfy before proceeding to diligence.</p>
              <BulletList
                items={mustHaves}
                onRemove={(item) => removeFromList(item, setMustHaves)}
                color="emerald"
                newValue={newMustHave}
                onNewValueChange={setNewMustHave}
                onAdd={() => addToList(newMustHave, mustHaves, setMustHaves, setNewMustHave)}
                placeholder="e.g. ARR ≥ $5M with ≥ 60% YoY growth"
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          {/* 3 — Financial Thresholds */}
          <SectionCard
            id="financial"
            icon={<DollarSign className="w-4 h-4 text-[color:var(--rev-primary)]" />}
            title="Financial Thresholds"
            open={openSections.has("financial")}
            onToggle={() => toggleSection("financial")}
          >
            <div className="pt-1">
              {thresholdFields.map((f) => (
                <div key={f.key} className="flex items-center gap-2.5 border-t border-[color:var(--rev-border)] py-2.5">
                  <span className="flex-1 text-[13px] text-[color:var(--rev-text-2)]">{f.label}</span>
                  <input
                    type="number"
                    value={f.value}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) { f.set(n); markDirty(); }
                    }}
                    className="w-[58px] rounded-md border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] py-1.5 text-center font-mono text-[13px] text-[color:var(--rev-text-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                  />
                  <span className="w-9 font-mono text-[10.5px] text-[color:var(--rev-text-7)]">{f.unit}</span>
                </div>
              ))}
              {/* Not part of the mockup's Financial Thresholds card, but real
                  fields read elsewhere (FirmProfileBlock's Firm Summary,
                  Deals.tsx, MandateBanner) — kept editable here rather than
                  silently dropped. */}
              <div className="flex items-center gap-2.5 border-t border-[color:var(--rev-border)] py-2.5">
                <span className="flex-1 text-[13px] text-[color:var(--rev-text-2)]">Hold Period</span>
                <input
                  value={holdPeriod}
                  onChange={(e) => { setHoldPeriod(e.target.value); markDirty(); }}
                  placeholder="4–6 years"
                  className="w-[130px] rounded-md border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-2 py-1.5 text-right text-xs text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                />
              </div>
              <div className="flex items-center gap-2.5 border-t border-[color:var(--rev-border)] py-2.5">
                <span className="flex-1 text-[13px] text-[color:var(--rev-text-2)]">Target Return</span>
                <input
                  value={targetReturn}
                  onChange={(e) => { setTargetReturn(e.target.value); markDirty(); }}
                  placeholder="3–5× MoIC / 25%+ IRR"
                  className="w-[130px] rounded-md border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-2 py-1.5 text-right text-xs text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                />
              </div>
            </div>
          </SectionCard>

          {/* 4 — Deal-Breaker Criteria */}
          <SectionCard
            id="dealBreakers"
            icon={<XCircle className="w-4 h-4 text-[color:var(--rev-danger)]" />}
            title="Deal-Breaker Criteria"
            badge={String(dealBreakers.length)}
            badgeColor="red"
            tone="danger"
            open={openSections.has("dealBreakers")}
            onToggle={() => toggleSection("dealBreakers")}
          >
            <div className="pt-3">
              <p className="mb-3 text-xs text-[color:var(--rev-danger)]/80">Automatic disqualifiers — any match is an instant pass regardless of other merits.</p>
              <BulletList
                items={dealBreakers}
                onRemove={(item) => removeFromList(item, setDealBreakers)}
                color="red"
                newValue={newDealBreaker}
                onNewValueChange={setNewDealBreaker}
                onAdd={() => addToList(newDealBreaker, dealBreakers, setDealBreakers, setNewDealBreaker)}
                placeholder="e.g. Minority stake without protective rights"
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ESG & Special Considerations aren't shown in this screen of the source
          mockup, but hold real saved data (esgCriteria/specialNotes) with no
          other home in the redesign — kept, full-width, below the 2-column grid. */}
      {/* 5 — ESG & Values Criteria */}
      <SectionCard
        id="esg"
        icon={<Leaf className="w-4 h-4 text-[color:var(--rev-info)]" />}
        title="ESG & Values Criteria"
        open={openSections.has("esg")}
        onToggle={() => toggleSection("esg")}
      >
        <div className="pt-3">
          <p className="mb-3 text-xs text-[color:var(--rev-text-6)]">Standards a company must meet or commit to for alignment with your firm's values.</p>
          <BulletList
            items={esgCriteria}
            onRemove={(item) => removeFromList(item, setEsgCriteria)}
            color="violet"
            newValue={newEsg}
            onNewValueChange={setNewEsg}
            onAdd={() => addToList(newEsg, esgCriteria, setEsgCriteria, setNewEsg)}
            placeholder="e.g. Net zero commitment roadmap"
          />
        </div>
      </SectionCard>

      {/* 6 — Special Considerations */}
      <SectionCard
        id="notes"
        icon={<FileText className="w-4 h-4 text-[color:var(--rev-text-6)]" />}
        title="Special Considerations & Structural Notes"
        open={openSections.has("notes")}
        onToggle={() => toggleSection("notes")}
      >
        <div className="pt-4">
          <Textarea
            value={specialNotes}
            onChange={(e) => { setSpecialNotes(e.target.value); markDirty(); }}
            rows={5}
            className="resize-y text-sm"
            placeholder="Special instructions for the scoring agent…"
          />
        </div>
      </SectionCard>

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface SectionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: "emerald" | "red";
  /** Deal-breakers gets the mockup's red-tinted card treatment (tinted border,
   * not a filled background) — visual only, doesn't affect any other prop. */
  tone?: "danger";
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SectionCard({ icon, title, badge, badgeColor, tone, open, onToggle, children }: SectionCardProps) {
  const badgeCls =
    badgeColor === "emerald"
      ? "text-[color:var(--rev-success)]"
      : badgeColor === "red"
      ? "text-[color:var(--rev-danger)]"
      : "text-[color:var(--rev-text-6)]";
  const badgeStyle =
    badgeColor === "emerald"
      ? { background: "var(--rev-tint-success)" }
      : badgeColor === "red"
      ? { background: "var(--rev-tint-danger)" }
      : { background: "var(--rev-tint-neutral)" };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-[color:var(--rev-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        tone === "danger" ? "border-[#F0DEDB]" : "border-[color:var(--rev-border)]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition hover:bg-[color:var(--rev-tint-neutral-subtle)]"
      >
        {icon}
        <span
          className={cn(
            "flex-1 font-mono text-[11px] font-semibold uppercase tracking-[0.075em]",
            tone === "danger" ? "text-[#9B4038]" : "text-[color:var(--rev-text-6)]"
          )}
        >
          {title}
        </span>
        {badge && (
          <span className={cn("mr-2 rounded-full px-2 py-0.5 text-xs font-semibold", badgeCls)} style={badgeStyle}>
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-[color:var(--rev-text-6)]" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[color:var(--rev-text-6)]" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// Sentinel select-item value for the "+ Custom…" option — chip values are
// always non-empty free text, so this can never collide with a real chip.
const CUSTOM_OPTION = "__custom__";

interface TagFieldProps {
  label: string;
  items: string[];
  /** Preset values offered in the add-dropdown, e.g. SECTOR_PRESETS. */
  presets: readonly string[];
  /** Singular noun used in "+ Add {addLabel}" / dropdown aria-label, e.g. "sector". */
  addLabel: string;
  onAdd: (value: string) => void;
  onRemove: (item: string) => void;
}

/** Chip list with a preset-dropdown-or-custom-input add flow: "+ Add X" opens
 * a dropdown of presets (excluding values already present, case-insensitive)
 * plus a "+ Custom…" option; picking a preset commits immediately, picking
 * "+ Custom…" swaps in a free-text input committed via Enter/Add button. */
function TagField({ label, items, presets, addLabel, onAdd, onRemove }: TagFieldProps) {
  const [mode, setMode] = useState<"closed" | "preset" | "custom">("closed");
  const [customValue, setCustomValue] = useState("");

  const usedLower = new Set(items.map((i) => i.toLowerCase()));
  const availablePresets = presets.filter((p) => !usedLower.has(p.toLowerCase()));

  const commitCustom = () => {
    const t = customValue.trim();
    if (t) onAdd(t);
    setMode("closed");
    setCustomValue("");
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[color:var(--rev-text-3)]">{label}</p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral)] py-1 pl-2.5 pr-1 text-xs text-[color:var(--rev-text-3)]"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="ml-0.5 leading-none text-[color:var(--rev-text-7)] hover:text-[color:var(--rev-text-3)]"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {mode === "preset" && (
          <Select
            onValueChange={(value) => {
              if (value === CUSTOM_OPTION) { setMode("custom"); setCustomValue(""); return; }
              onAdd(value);
              setMode("closed");
            }}
          >
            <SelectTrigger
              className="h-8 min-w-[180px] rounded-lg border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] text-xs text-[color:var(--rev-text-2)]"
              aria-label={`Select ${addLabel} to add`}
            >
              <SelectValue placeholder="Select to add…" />
            </SelectTrigger>
            <SelectContent>
              {availablePresets.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
              <SelectItem value={CUSTOM_OPTION}>+ Custom…</SelectItem>
            </SelectContent>
          </Select>
        )}

        {mode === "custom" && (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitCustom(); }
                else if (e.key === "Escape") { setMode("closed"); setCustomValue(""); }
              }}
              placeholder="Type & Enter"
              className="h-8 w-36 rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-2.5 text-xs text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
            />
            <button
              type="button"
              onClick={commitCustom}
              className="rounded-lg bg-[color:var(--rev-primary)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            >
              Add
            </button>
          </span>
        )}
      </div>

      {mode === "closed" && (
        <button
          type="button"
          onClick={() => setMode("preset")}
          className="flex items-center gap-1 text-xs font-medium text-[color:var(--rev-primary)] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />Add {addLabel}
        </button>
      )}
    </div>
  );
}

interface BulletListProps {
  items: string[];
  onRemove: (item: string) => void;
  color: "emerald" | "red" | "violet";
  newValue: string;
  onNewValueChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}

// No `--rev-tint-info` token exists (unlike success/danger) — derived via
// color-mix from `--rev-info`, matching the same pattern SummaryTab.tsx and
// DealScorecardTab.tsx already use for one-off tinted surfaces.
const BULLET_TONE: Record<BulletListProps["color"], { dot: string; border: string; bg: string }> = {
  emerald: { dot: "var(--rev-success)", border: "color-mix(in srgb, var(--rev-success) 22%, white)", bg: "var(--rev-tint-success)" },
  red: { dot: "var(--rev-danger)", border: "color-mix(in srgb, var(--rev-danger) 20%, white)", bg: "var(--rev-tint-danger)" },
  violet: { dot: "var(--rev-info)", border: "color-mix(in srgb, var(--rev-info) 20%, white)", bg: "color-mix(in srgb, var(--rev-info) 8%, white)" },
};

function BulletList({ items, onRemove, color, newValue, onNewValueChange, onAdd, placeholder }: BulletListProps) {
  const tone = BULLET_TONE[color];

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item}
          className="group flex items-center gap-2.5 rounded-lg border px-3 py-2"
          style={{ borderColor: tone.border, background: tone.bg }}
        >
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: tone.dot }} />
          <span className="flex-1 text-sm text-[color:var(--rev-text-2)]">{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="text-[color:var(--rev-text-7)] opacity-0 transition-opacity hover:text-[color:var(--rev-danger)] group-hover:opacity-100"
            aria-label={`Remove ${item}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="flex-1 rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-3 py-1.5 text-sm text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
        />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg border border-[color:var(--rev-border-strong)] px-3 py-1.5 text-xs font-medium text-[color:var(--rev-primary)] transition hover:bg-[color:var(--rev-tint-primary)]"
        >
          <Plus className="w-3.5 h-3.5" />Add
        </button>
      </div>
    </div>
  );
}
