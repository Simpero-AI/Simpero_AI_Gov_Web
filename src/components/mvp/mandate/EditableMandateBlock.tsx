import type React from "react";
import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronUp, DollarSign, Target,
  CheckCircle2, XCircle, Leaf, FileText, Plus, X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MANDATE_CATEGORIES_QUERY_KEY,
  MANDATE_QUERY_KEY,
  fetchMandate,
  fetchMandateCategories,
  putMandate,
  type MandateCategory,
} from "@/api/mandate";
import {
  categoryDisplayName,
  createEmptySubSelections,
  fromMandateItems,
  optionsForSection,
  subOptionLabelsForSection,
  toMandateItems,
  type MandateSection,
  type SubSelections,
} from "@/lib/mandateSelection";
import { toast } from "@/components/mvp/primitives/sonner";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/mvp/primitives/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/mvp/primitives/command";
import { MANDATE_DEFAULTS, type InvestmentProfile } from "@/data/mandateDefaults";
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

const NO_OPTIONS_CONFIGURED = "No options configured — ask a platform admin.";

/** Every user-editable field this component owns, snapshotted for real
 * dirty detection (not a "was anything touched" flag) — see buildSnapshot. */
interface MandateSnapshotFields {
  checkMin: number;
  checkMax: number;
  minMrr: number;
  minMomGrowth: number;
  maxBurnMultiple: number;
  minRunway: number;
  maxValMultiple: number;
  holdPeriod: string;
  targetReturn: string;
  esgCriteria: string[];
  specialNotes: string;
  sectorLabels: string[];
  geoLabels: string[];
  investmentStages: string[];
  dealTypeLabels: string[];
  assetClassLabels: string[];
  mustHaves: string[];
  dealBreakers: string[];
  subSelections: SubSelections;
}

/** Every field here is a primitive, a string array, or subSelections (a plain
 * nested record with deterministic key order — see createEmptySubSelections/
 * addSub/removeSub in mandateSelection.ts and this file), so plain
 * JSON.stringify equality is stable and sufficient — no deep-equal dependency. */
function buildSnapshot(fields: MandateSnapshotFields): string {
  return JSON.stringify(fields);
}

/** optionsForSection returns `{id, option}[] | null`; TagField/BulletList's
 * `options` prop is plain labels (chip identity is the label, not the id —
 * id/categoryId are only resolved again at save time via toMandateItems). */
function sectionOptionLabels(categories: MandateCategory[], section: MandateSection): string[] | null {
  const options = optionsForSection(categories, section);
  return options ? options.map((o) => o.option) : null;
}

export function EditableMandateBlock({ profile, saveRef, onStateChange }: Props) {
  const queryClient = useQueryClient();
  const putMandateMutation = useMutation({ mutationFn: putMandate });

  const categoriesQuery = useQuery({
    queryKey: MANDATE_CATEGORIES_QUERY_KEY,
    queryFn: fetchMandateCategories,
  });
  const mandateQuery = useQuery({ queryKey: MANDATE_QUERY_KEY, queryFn: fetchMandate });
  // Stable empty-array reference when unloaded — categoriesQuery.data ?? []
  // would otherwise re-create a new array every render and defeat doSave's
  // useCallback memoization.
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const hydratedRef = useRef<string | null>(null);
  // Guard: once the form has been hydrated from the profile, never overwrite
  // user edits even if the profile query refetches in the background.
  const hasHydrated = useRef(false);
  // Separate one-shot guard for the mandate-categories-backed fields (D4) —
  // these hydrate from GET /mandate, not from `profile`, so they need their
  // own ref rather than piggybacking on hasHydrated above.
  const hasHydratedMandate = useRef(false);
  // State (not just the refs above) mirroring "hydration effect has run" —
  // refs flip synchronously mid-effect, before React has re-rendered with
  // that effect's own setState calls applied, so a later effect in the same
  // commit that only checks the *refs* can see "hydrated: true" while
  // `currentSnapshot` in its closure still reflects the pre-hydration
  // render. Depending on these state flags instead guarantees the capture
  // effect below only runs on a render where the hydrated values are
  // actually reflected in `currentSnapshot`.
  const [blobHydrated, setBlobHydrated] = useState(false);
  const [mandateHydrated, setMandateHydrated] = useState(false);
  // Baseline snapshot (of every field below) captured once, the first time
  // BOTH hydration sources above have settled — see the capture effect below
  // buildSnapshot's useMemo. `null` means hydration hasn't finished yet, so
  // there's nothing to compare against (treated as not-dirty). State, not a
  // ref — `isDirty` below reads it during render, and refs can't be read
  // during render (react-hooks/refs).
  const [originalSnapshot, setOriginalSnapshot] = useState<string | null>(null);
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
  // The card itself is commented out below (D3, revised) but this state and
  // the save payload stay live — a one-line JSX uncomment restores an editor.
  // No fabricated fallback (§7 Q2) — defaults to empty, same as esgCriteria/
  // specialNotes below.
  const [holdPeriod, setHoldPeriod] = useState(() => getString(m, "holdPeriod", ""));
  const [targetReturn, setTargetReturn] = useState(() => getString(m, "targetReturn", ""));
  // The seven category-backed fields (D1) — hydrated from GET /mandate only
  // (see the mandate-hydration effect below), never from the legacy blob.
  const [sectorLabels, setSectorLabels] = useState<string[]>([]);
  const [geoLabels, setGeoLabels] = useState<string[]>([]);
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [dealTypeLabels, setDealTypeLabels] = useState<string[]>([]);
  const [assetClassLabels, setAssetClassLabels] = useState<string[]>([]);
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  // Sub-selections (mandate-suboptions plan D5) — one parallel record rather
  // than restructuring the seven string[] states above into objects. Keyed
  // by section then by the parent chip's label (chip identity is the label).
  const [subSelections, setSubSelections] = useState<SubSelections>(() => createEmptySubSelections());
  // No fabricated fallback (§7 Q3) — both default to empty.
  const [esgCriteria, setEsgCriteria] = useState<string[]>(() => getStringArray(m, "esgCriteria", []));
  const [specialNotes, setSpecialNotes] = useState(() => getString(m, "specialNotes", ""));

  // Inline add input — only ESG & Values keeps a free-text path (D6); every
  // other list is dropdown-only via OptionPicker.
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
    setHoldPeriod(getString(mn, "holdPeriod", ""));
    setTargetReturn(getString(mn, "targetReturn", ""));
    setEsgCriteria(getStringArray(mn, "esgCriteria", []));
    setSpecialNotes(getString(mn, "specialNotes", ""));
    setBlobHydrated(true);
  }, [profile]);

  useEffect(() => {
    // Only hydrate once, and only once the mandate query has settled
    // (including a `null` result for an org that's never saved) — same
    // never-overwrite-user-edits guard as the effect above, on its own ref.
    if (hasHydratedMandate.current) return;
    if (!mandateQuery.isSuccess) return;
    hasHydratedMandate.current = true;
    const { sections, subSelections: hydratedSubSelections, checkSize } = fromMandateItems(
      mandateQuery.data?.mandate ?? []
    );
    setInvestmentStages(sections.investmentStages);
    setGeoLabels(sections.geoLabels);
    setSectorLabels(sections.sectorLabels);
    setDealTypeLabels(sections.dealTypeLabels);
    setAssetClassLabels(sections.assetClassLabels);
    setMustHaves(sections.mustHaves);
    setDealBreakers(sections.dealBreakers);
    setSubSelections(hydratedSubSelections);
    // Check Size Range is now authoritative in GET /mandate too (D2 revised)
    // — but only once the "Check Size Range" category exists everywhere. If
    // `checkSize` is null (category not yet created, or org never saved),
    // Effect A's blob-sourced value above stands instead of being overwritten.
    if (checkSize) {
      setCheckMin(checkSize.min);
      setCheckMax(checkSize.max);
    }
    setMandateHydrated(true);
  }, [mandateQuery.isSuccess, mandateQuery.data]);

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        checkMin, checkMax, minMrr, minMomGrowth, maxBurnMultiple, minRunway, maxValMultiple,
        holdPeriod, targetReturn, esgCriteria, specialNotes,
        sectorLabels, geoLabels, investmentStages, dealTypeLabels, assetClassLabels, mustHaves, dealBreakers,
        subSelections,
      }),
    [checkMin, checkMax, minMrr, minMomGrowth, maxBurnMultiple, minRunway, maxValMultiple,
      holdPeriod, targetReturn, esgCriteria, specialNotes,
      sectorLabels, geoLabels, investmentStages, dealTypeLabels, assetClassLabels, mustHaves, dealBreakers,
      subSelections]
  );

  // Depends on the two hydration *state* flags, not the refs and not
  // `currentSnapshot` itself — an org with no saved mandate hydrates to a
  // snapshot that's string-identical to its pre-hydration default (all
  // empty), so a `[currentSnapshot]` dep would never see that render as
  // "changed" and would never detect hydration settling for that (very
  // common) case. `blobHydrated`/`mandateHydrated` each flip false→true
  // exactly once, on the render where their effect's setState calls have
  // already landed — guaranteeing `currentSnapshot` in *this* effect's
  // closure reflects the real hydrated values, unlike checking the refs
  // directly (which flip synchronously mid-effect, before that render).
  useEffect(() => {
    if (originalSnapshot !== null) return;
    if (!blobHydrated || !mandateHydrated) return;
    setOriginalSnapshot(currentSnapshot);
  }, [blobHydrated, mandateHydrated, originalSnapshot, currentSnapshot]);

  // Derived, not tracked — dirty means "current state differs from the
  // captured baseline", not "something was touched" (a field changed then
  // changed back must report not-dirty).
  const isDirty = originalSnapshot !== null && currentSnapshot !== originalSnapshot;

  const doSave = useCallback(async () => {
    // No-op if a save is already in flight (D5) — MandateScorecard's Save
    // button ignores doSave's return value, so this is the only guard.
    if (putMandateMutation.isPending) return;

    const selections: Record<MandateSection, string[]> = {
      investmentStages, geoLabels, sectorLabels, dealTypeLabels, assetClassLabels, mustHaves, dealBreakers,
    };

    // The legacy trpc.investmentProfile.upsert write that used to run here
    // alongside putMandate is gone: it 404s unconditionally (Express/tRPC
    // was removed with the FastAPI migration and no write endpoint was ever
    // ported), and Promise.all([...]) meant that 404 failed this entire save
    // even though putMandate below succeeded. As a result, holdPeriod,
    // targetReturn, esgCriteria, specialNotes, and the five Financial
    // Thresholds fields (minMrr, minMomGrowth, maxBurnMultiple, minRunway,
    // maxValMultiple) — which only ever lived in that legacy blob — have no
    // persistence path right now. Their state/inputs are kept live on
    // purpose; wire them up once a real backend write endpoint exists.
    try {
      await putMandateMutation.mutateAsync(
        toMandateItems(selections, subSelections, { min: checkMin, max: checkMax }, categories)
      );
      await queryClient.invalidateQueries({ queryKey: MANDATE_QUERY_KEY });
      // Move the baseline forward to the just-saved values — otherwise the
      // next render would immediately compare current state against the
      // *pre-save* baseline and show dirty again.
      setOriginalSnapshot(currentSnapshot);
      toast.success("Mandate saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save mandate.");
    }
  }, [putMandateMutation, queryClient, categories, checkMin, checkMax, subSelections, currentSnapshot,
    sectorLabels, geoLabels, investmentStages, dealTypeLabels, assetClassLabels, mustHaves, dealBreakers,
  ]);

  useEffect(() => {
    if (saveRef) saveRef.current = doSave;
  }, [saveRef, doSave]);

  useEffect(() => {
    onStateChange?.({ dirty: isDirty, saving: putMandateMutation.isPending });
  }, [isDirty, putMandateMutation.isPending, onStateChange]);

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

  const addToList = (
    val: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setNew?: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const t = val.trim();
    if (t && !list.includes(t)) { setList((p) => [...p, t]); }
    setNew?.("");
  };

  const removeFromList = (
    item: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    /** When given, also clears that label's sub-selections (D5) — required
     * for all five TagField sections, not just Geographies, since a future
     * category with children works with no code change here. */
    section?: MandateSection
  ) => {
    setList((p) => p.filter((x) => x !== item));
    if (section) {
      setSubSelections((prev) => {
        if (!(item in prev[section])) return prev;
        const { [item]: _removed, ...rest } = prev[section];
        return { ...prev, [section]: rest };
      });
    }
  };

  const addSub = (section: MandateSection, parent: string, value: string) => {
    const t = value.trim();
    if (!t) return;
    setSubSelections((prev) => {
      const existing = prev[section][parent] ?? [];
      if (existing.includes(t)) return prev;
      return { ...prev, [section]: { ...prev[section], [parent]: [...existing, t] } };
    });
  };

  const removeSub = (section: MandateSection, parent: string, value: string) => {
    setSubSelections((prev) => {
      const existing = prev[section][parent] ?? [];
      return { ...prev, [section]: { ...prev[section], [parent]: existing.filter((x) => x !== value) } };
    });
  };

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
            badge={`${sectorLabels.length} sectors · ${geoLabels.length} geos · ${dealTypeLabels.length} deal types`}
            open={openSections.has("parameters")}
            onToggle={() => toggleSection("parameters")}
          >
            <div className="grid grid-cols-2 gap-x-5 gap-y-5 pt-4">
              <TagField
                label={categoryDisplayName(categories, "investmentStages")}
                items={investmentStages}
                options={sectionOptionLabels(categories, "investmentStages")}
                addLabel="stage"
                onAdd={(value) => addToList(value, investmentStages, setInvestmentStages)}
                onRemove={(item) => removeFromList(item, setInvestmentStages, "investmentStages")}
                subOptions={subOptionLabelsForSection(categories, "investmentStages")}
                subItems={subSelections.investmentStages}
                onAddSub={(parent, value) => addSub("investmentStages", parent, value)}
                onRemoveSub={(parent, value) => removeSub("investmentStages", parent, value)}
              />
              <TagField
                label={categoryDisplayName(categories, "geoLabels")}
                items={geoLabels}
                options={sectionOptionLabels(categories, "geoLabels")}
                addLabel="geography"
                onAdd={(value) => addToList(value, geoLabels, setGeoLabels)}
                onRemove={(item) => removeFromList(item, setGeoLabels, "geoLabels")}
                subOptions={subOptionLabelsForSection(categories, "geoLabels")}
                subItems={subSelections.geoLabels}
                onAddSub={(parent, value) => addSub("geoLabels", parent, value)}
                onRemoveSub={(parent, value) => removeSub("geoLabels", parent, value)}
              />
              <TagField
                label={categoryDisplayName(categories, "sectorLabels")}
                items={sectorLabels}
                options={sectionOptionLabels(categories, "sectorLabels")}
                addLabel="sector"
                onAdd={(value) => addToList(value, sectorLabels, setSectorLabels)}
                onRemove={(item) => removeFromList(item, setSectorLabels, "sectorLabels")}
                subOptions={subOptionLabelsForSection(categories, "sectorLabels")}
                subItems={subSelections.sectorLabels}
                onAddSub={(parent, value) => addSub("sectorLabels", parent, value)}
                onRemoveSub={(parent, value) => removeSub("sectorLabels", parent, value)}
              />
              <TagField
                label={categoryDisplayName(categories, "dealTypeLabels")}
                items={dealTypeLabels}
                options={sectionOptionLabels(categories, "dealTypeLabels")}
                addLabel="deal type"
                onAdd={(value) => addToList(value, dealTypeLabels, setDealTypeLabels)}
                onRemove={(item) => removeFromList(item, setDealTypeLabels, "dealTypeLabels")}
                subOptions={subOptionLabelsForSection(categories, "dealTypeLabels")}
                subItems={subSelections.dealTypeLabels}
                onAddSub={(parent, value) => addSub("dealTypeLabels", parent, value)}
                onRemoveSub={(parent, value) => removeSub("dealTypeLabels", parent, value)}
              />
              {/* Asset Classes — not needed for now, commented out (reversible,
                  same treatment as Financial Thresholds/ESG above). State
                  (assetClassLabels), its section in the type system, and the
                  save payload are all left live — restoring this picker is a
                  one-line JSX uncomment. */}
              {/*
              <TagField
                label={categoryDisplayName(categories, "assetClassLabels")}
                items={assetClassLabels}
                options={sectionOptionLabels(categories, "assetClassLabels")}
                addLabel="asset class"
                onAdd={(value) => addToList(value, assetClassLabels, setAssetClassLabels)}
                onRemove={(item) => removeFromList(item, setAssetClassLabels, "assetClassLabels")}
                subOptions={subOptionLabelsForSection(categories, "assetClassLabels")}
                subItems={subSelections.assetClassLabels}
                onAddSub={(parent, value) => addSub("assetClassLabels", parent, value)}
                onRemoveSub={(parent, value) => removeSub("assetClassLabels", parent, value)}
              />
              */}
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
                      if (Number.isFinite(n)) { setCheckMin(n); }
                    }}
                    className="w-[52px] rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-1.5 py-1 text-center text-sm text-[color:var(--rev-text-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
                  />
                  <span className="text-[color:var(--rev-text-7)]">–</span>
                  <input
                    type="number"
                    value={checkMax}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) { setCheckMax(n); }
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
            title={categoryDisplayName(categories, "mustHaves")}
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
                options={sectionOptionLabels(categories, "mustHaves")}
                pickerLabel="must-have criterion"
                onAdd={(value) => addToList(value, mustHaves, setMustHaves)}
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          {/* 3 — Financial Thresholds — commented out (D3, revised
              2026-08-15): the user asked for the whole card gone, not
              relocated. State/thresholdFields/save payload below stay live —
              restoring this editor is a one-line JSX uncomment. */}
          {/*
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
          */}

          {/* 4 — Deal-Breaker Criteria */}
          <SectionCard
            id="dealBreakers"
            icon={<XCircle className="w-4 h-4 text-[color:var(--rev-danger)]" />}
            title={categoryDisplayName(categories, "dealBreakers")}
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
                options={sectionOptionLabels(categories, "dealBreakers")}
                pickerLabel="deal-breaker criterion"
                onAdd={(value) => addToList(value, dealBreakers, setDealBreakers)}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ESG & Values Criteria and Special Considerations & Structural Notes
          — commented out (removed from the UI, not needed right now), same
          reversible-hide treatment as Financial Thresholds above. State
          (esgCriteria/specialNotes), their handlers, and the save payload
          are all left live; restoring this editor is a one-line JSX
          uncomment. */}
      {/*
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
            onAdd={(value) => addToList(value, esgCriteria, setEsgCriteria, setNewEsg)}
            placeholder="e.g. Net zero commitment roadmap"
          />
        </div>
      </SectionCard>

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
      */}

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

interface OptionPickerProps {
  /** Used in the trigger's "Add {label}" text, and (absent commandLabel) the search input's aria-label. */
  label: string;
  options: string[];
  /** Currently-selected values — filtered out of the offered list, case-insensitively. */
  used: string[];
  disabled: boolean;
  disabledReason?: string;
  onSelect: (value: string) => void;
  /** Overrides the search input's aria-label — defaults to `Select ${label} to add`.
   * Used by the sub-option picker (mandate-suboptions plan D6) to read
   * "Select an option under Canada to add" instead of "Select under Canada to add". */
  commandLabel?: string;
}

/**
 * Dropdown-only add control (D6) — Popover + cmdk Command, shared by
 * TagField (chips) and BulletList (rows). Replaces the old
 * preset-Select-or-custom-free-text flow: no free-text escape hatch exists
 * anymore, values must come from the backend-configured option list.
 */
function OptionPicker({ label, options, used, disabled, disabledReason, onSelect, commandLabel }: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const usedLower = new Set(used.map((u) => u.toLowerCase()));
  const available = options.filter((o) => !usedLower.has(o.toLowerCase()));

  if (disabled) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed items-center gap-1 text-xs font-medium text-[color:var(--rev-text-7)]"
        >
          <Plus className="w-3.5 h-3.5" />Add {label}
        </button>
        {disabledReason && (
          <span className="text-[11px] italic text-[color:var(--rev-text-7)]">{disabledReason}</span>
        )}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-[color:var(--rev-primary)] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />Add {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        {/* cmdk's Input always sets aria-labelledby to its own hidden internal
            <label>, which wins over a plain aria-label on CommandInput per
            accessible-name computation — the accessible name has to come from
            Command's own `label` prop instead. */}
        <Command label={commandLabel ?? `Select ${label} to add`}>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {available.map((opt) => (
              <CommandItem
                key={opt}
                value={opt}
                onSelect={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface TagFieldProps {
  label: string;
  items: string[];
  /** From optionsForSection — null when the category is absent from /mandate-categories. */
  options: string[] | null;
  /** Singular noun used in "+ Add {addLabel}" / picker aria-label, e.g. "sector". */
  addLabel: string;
  onAdd: (value: string) => void;
  onRemove: (item: string) => void;
  /** From subOptionLabelsForSection — parent label → available child labels.
   * A chip whose label has no entry here renders exactly as before, no caret
   * (mandate-suboptions plan D6). */
  subOptions?: Record<string, string[]>;
  /** Parent label → currently-selected child labels. */
  subItems?: Record<string, string[]>;
  onAddSub?: (parent: string, value: string) => void;
  onRemoveSub?: (parent: string, value: string) => void;
}

/** Chip list with a dropdown-only add flow (D6/D7) — no free-text escape
 * hatch; a missing or empty category renders a disabled trigger with an
 * explanatory note instead of silently doing nothing. A chip whose option
 * has children (D6/D9) additionally renders an "Add under {item}" trigger
 * and its selected children as smaller removable chips indented beneath it —
 * one level only (D7), reusing OptionPicker verbatim. */
function TagField({
  label, items, options, addLabel, onAdd, onRemove, subOptions, subItems, onAddSub, onRemoveSub,
}: TagFieldProps) {
  const disabled = !options || options.length === 0;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[color:var(--rev-text-3)]">{label}</p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {items.map((item) => {
          const children = subOptions?.[item] ?? [];
          const selectedChildren = subItems?.[item] ?? [];
          const hasChildren = children.length > 0;

          return (
            <Fragment key={item}>
              <span className="flex items-center gap-1.5 rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-tint-neutral)] py-1 pl-2.5 pr-1 text-xs text-[color:var(--rev-text-3)]">
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
              {hasChildren && (
                <div className="ml-3 flex basis-full flex-wrap items-center gap-1 border-l border-[color:var(--rev-border)] pl-2.5">
                  {selectedChildren.map((child) => (
                    <span
                      key={child}
                      className="flex items-center gap-1 rounded-md border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] py-0.5 pl-2 pr-0.5 text-[11px] text-[color:var(--rev-text-6)]"
                    >
                      {child}
                      <button
                        type="button"
                        onClick={() => onRemoveSub?.(item, child)}
                        className="ml-0.5 leading-none text-[color:var(--rev-text-7)] hover:text-[color:var(--rev-text-3)]"
                        aria-label={`Remove ${child}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <OptionPicker
                    label={`under ${item}`}
                    options={children}
                    used={selectedChildren}
                    disabled={false}
                    onSelect={(value) => onAddSub?.(item, value)}
                    commandLabel={`Select an option under ${item} to add`}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      <OptionPicker
        label={addLabel}
        options={options ?? []}
        used={items}
        disabled={disabled}
        disabledReason={disabled ? NO_OPTIONS_CONFIGURED : undefined}
        onSelect={onAdd}
      />
    </div>
  );
}

interface BulletListProps {
  items: string[];
  onRemove: (item: string) => void;
  color: "emerald" | "red" | "violet";
  onAdd: (value: string) => void;
  /** When provided (even as `null`/`[]`), renders OptionPicker instead of the
   * free-text input/Add button (D6). `null`/`[]` → disabled + D7 note.
   * Omitted entirely → ESG's free-text path (not a MandateOptions category). */
  options?: string[] | null;
  /** Required when `options` is provided — see OptionPickerProps.label. */
  pickerLabel?: string;
  // Free-text mode only (ESG & Values) — required when `options` is omitted.
  newValue?: string;
  onNewValueChange?: (v: string) => void;
  placeholder?: string;
}

// No `--rev-tint-info` token exists (unlike success/danger) — derived via
// color-mix from `--rev-info`, matching the same pattern SummaryTab.tsx and
// DealScorecardTab.tsx already use for one-off tinted surfaces.
const BULLET_TONE: Record<BulletListProps["color"], { dot: string; border: string; bg: string }> = {
  emerald: { dot: "var(--rev-success)", border: "color-mix(in srgb, var(--rev-success) 22%, white)", bg: "var(--rev-tint-success)" },
  red: { dot: "var(--rev-danger)", border: "color-mix(in srgb, var(--rev-danger) 20%, white)", bg: "var(--rev-tint-danger)" },
  violet: { dot: "var(--rev-info)", border: "color-mix(in srgb, var(--rev-info) 20%, white)", bg: "color-mix(in srgb, var(--rev-info) 8%, white)" },
};

function BulletList({
  items, onRemove, color, onAdd, options, pickerLabel, newValue, onNewValueChange, placeholder,
}: BulletListProps) {
  const tone = BULLET_TONE[color];
  const usingPicker = options !== undefined;
  const disabled = usingPicker && (!options || options.length === 0);

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
      {usingPicker ? (
        <div className="mt-2">
          <OptionPicker
            label={pickerLabel ?? "option"}
            options={options ?? []}
            used={items}
            disabled={disabled}
            disabledReason={disabled ? NO_OPTIONS_CONFIGURED : undefined}
            onSelect={onAdd}
          />
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            value={newValue ?? ""}
            onChange={(e) => onNewValueChange?.(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(newValue ?? ""); } }}
            className="flex-1 rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-3 py-1.5 text-sm text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]"
          />
          <button
            type="button"
            onClick={() => onAdd(newValue ?? "")}
            className="flex items-center gap-1 rounded-lg border border-[color:var(--rev-border-strong)] px-3 py-1.5 text-xs font-medium text-[color:var(--rev-primary)] transition hover:bg-[color:var(--rev-tint-primary)]"
          >
            <Plus className="w-3.5 h-3.5" />Add
          </button>
        </div>
      )}
    </div>
  );
}
