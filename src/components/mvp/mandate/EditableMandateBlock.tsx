import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronUp, DollarSign, Target,
  CheckCircle2, XCircle, Leaf, FileText, Plus, X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/mvp/primitives/sonner";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { MANDATE_DEFAULTS, type InvestmentProfile } from "@/data/mandateDefaults";
import { cn } from "@/lib/utils";

interface Props {
  profile: InvestmentProfile | null;
  saveRef?: React.MutableRefObject<(() => void) | null>;
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

export function EditableMandateBlock({ profile, saveRef }: Props) {
  const utils = trpc.useUtils();
  const upsertMutation = trpc.investmentProfile.upsert.useMutation({
    onSuccess: async () => {
      await utils.investmentProfile.get.invalidate();
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
    new Set(["financial", "universe", "mustHaves", "dealBreakers", "esg", "notes"])
  );

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const m = profile?.mandate ?? {};
  const [checkSize, setCheckSize] = useState(() => getString(m, "checkSize", MANDATE_DEFAULTS.checkSize));
  const [revenueBand, setRevenueBand] = useState(() => getString(m, "revenueBand", MANDATE_DEFAULTS.revenueBand));
  const [ebitda, setEbitda] = useState(() => getString(m, "ebitda", MANDATE_DEFAULTS.ebitda));
  const [grossMargin, setGrossMargin] = useState(() => getString(m, "grossMargin", MANDATE_DEFAULTS.grossMargin));
  const [holdPeriod, setHoldPeriod] = useState(() => getString(m, "holdPeriod", MANDATE_DEFAULTS.holdPeriod));
  const [targetReturn, setTargetReturn] = useState(() => getString(m, "targetReturn", MANDATE_DEFAULTS.targetReturn));
  const [ownership, setOwnership] = useState(() => getString(m, "ownership", MANDATE_DEFAULTS.ownership));
  const [maxValuation, setMaxValuation] = useState(() => getString(m, "maxValuation", MANDATE_DEFAULTS.maxValuation));
  const [sectorLabels, setSectorLabels] = useState<string[]>(() =>
    getStringArray(m, "mandateSectorLabels", MANDATE_DEFAULTS.mandateSectorLabels)
  );
  const [geoLabels, setGeoLabels] = useState<string[]>(() =>
    getStringArray(m, "mandateGeoLabels", MANDATE_DEFAULTS.mandateGeoLabels)
  );
  const [investmentStages, setInvestmentStages] = useState<string[]>(() =>
    getStringArray(m, "investmentStages", MANDATE_DEFAULTS.investmentStages)
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

  // Inline add inputs
  const [newSector, setNewSector] = useState("");
  const [newGeo, setNewGeo] = useState("");
  const [newStage, setNewStage] = useState("");
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
    setCheckSize(getString(mn, "checkSize", MANDATE_DEFAULTS.checkSize));
    setRevenueBand(getString(mn, "revenueBand", MANDATE_DEFAULTS.revenueBand));
    setEbitda(getString(mn, "ebitda", MANDATE_DEFAULTS.ebitda));
    setGrossMargin(getString(mn, "grossMargin", MANDATE_DEFAULTS.grossMargin));
    setHoldPeriod(getString(mn, "holdPeriod", MANDATE_DEFAULTS.holdPeriod));
    setTargetReturn(getString(mn, "targetReturn", MANDATE_DEFAULTS.targetReturn));
    setOwnership(getString(mn, "ownership", MANDATE_DEFAULTS.ownership));
    setMaxValuation(getString(mn, "maxValuation", MANDATE_DEFAULTS.maxValuation));
    setSectorLabels(getStringArray(mn, "mandateSectorLabels", MANDATE_DEFAULTS.mandateSectorLabels));
    setGeoLabels(getStringArray(mn, "mandateGeoLabels", MANDATE_DEFAULTS.mandateGeoLabels));
    setInvestmentStages(getStringArray(mn, "investmentStages", MANDATE_DEFAULTS.investmentStages));
    setMustHaves(getStringArray(mn, "mustHaves", MANDATE_DEFAULTS.mustHaves));
    setDealBreakers(getStringArray(mn, "dealBreakers", MANDATE_DEFAULTS.dealBreakers));
    setEsgCriteria(getStringArray(mn, "esgCriteria", MANDATE_DEFAULTS.esgCriteria));
    setSpecialNotes(getString(mn, "specialNotes", MANDATE_DEFAULTS.specialNotes));
  }, [profile]);

  const doSave = useCallback(() => {
    upsertMutation.mutate({
      mandate: {
        checkSize, revenueBand, ebitda, grossMargin, holdPeriod,
        targetReturn, ownership, maxValuation,
        mandateSectorLabels: sectorLabels,
        mandateGeoLabels: geoLabels,
        investmentStages, mustHaves, dealBreakers, esgCriteria, specialNotes,
      },
    });
  }, [
    checkSize, revenueBand, ebitda, grossMargin, holdPeriod, targetReturn,
    ownership, maxValuation, sectorLabels, geoLabels, investmentStages,
    mustHaves, dealBreakers, esgCriteria, specialNotes, upsertMutation,
  ]);

  useEffect(() => {
    if (saveRef) saveRef.current = doSave;
  }, [saveRef, doSave]);

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
    setNew: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const t = val.trim();
    if (t && !list.includes(t)) { setList((p) => [...p, t]); setIsDirty(true); }
    setNew("");
  };

  const removeFromList = (
    item: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => { setList((p) => p.filter((x) => x !== item)); setIsDirty(true); };

  return (
    <div className="space-y-3">

      {/* 1 — Financial Thresholds */}
      <SectionCard
        id="financial"
        icon={<DollarSign className="w-4 h-4 text-blue-500" />}
        title="Financial Thresholds"
        open={openSections.has("financial")}
        onToggle={() => toggleSection("financial")}
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 pt-4">
          {(
            [
              { label: "Check Size", value: checkSize, set: setCheckSize, placeholder: "$10M – $50M" },
              { label: "Revenue Band", value: revenueBand, set: setRevenueBand, placeholder: "$10M – $100M ARR" },
              { label: "Min EBITDA Margin", value: ebitda, set: setEbitda, placeholder: "Rule of 40 ≥ 30%" },
              { label: "Min Gross Margin", value: grossMargin, set: setGrossMargin, placeholder: "≥ 70%" },
              { label: "Max Entry Valuation", value: maxValuation, set: setMaxValuation, placeholder: "$500M" },
              { label: "Hold Period", value: holdPeriod, set: setHoldPeriod, placeholder: "4–6 years" },
              { label: "Target Return", value: targetReturn, set: setTargetReturn, placeholder: "3–5× MoIC / 25%+ IRR" },
              { label: "Ownership Target", value: ownership, set: setOwnership, placeholder: "Minority (10–25%)" },
            ] as { label: string; value: string; set: (v: string) => void; placeholder: string }[]
          ).map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{label}</label>
              <input
                value={value}
                onChange={(e) => { set(e.target.value); markDirty(); }}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 bg-white"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2 — Target Universe */}
      <SectionCard
        id="universe"
        icon={<Target className="w-4 h-4 text-blue-500" />}
        title="Target Universe"
        badge={`${sectorLabels.length} sectors · ${geoLabels.length} geos`}
        open={openSections.has("universe")}
        onToggle={() => toggleSection("universe")}
      >
        <div className="space-y-5 pt-4">
          <TagField
            label="Target Sectors"
            items={sectorLabels}
            newValue={newSector}
            onNewValueChange={setNewSector}
            onAdd={() => addToList(newSector, sectorLabels, setSectorLabels, setNewSector)}
            onRemove={(item) => removeFromList(item, setSectorLabels)}
            placeholder="e.g. B2B SaaS"
          />
          <TagField
            label="Investment Stages"
            items={investmentStages}
            newValue={newStage}
            onNewValueChange={setNewStage}
            onAdd={() => addToList(newStage, investmentStages, setInvestmentStages, setNewStage)}
            onRemove={(item) => removeFromList(item, setInvestmentStages)}
            placeholder="e.g. Series B"
          />
          <TagField
            label="Geographies"
            items={geoLabels}
            newValue={newGeo}
            onNewValueChange={setNewGeo}
            onAdd={() => addToList(newGeo, geoLabels, setGeoLabels, setNewGeo)}
            onRemove={(item) => removeFromList(item, setGeoLabels)}
            placeholder="e.g. North America"
          />
        </div>
      </SectionCard>

      {/* 3 — Must-Haves */}
      <SectionCard
        id="mustHaves"
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        title="Must-Haves"
        badge={String(mustHaves.length)}
        badgeColor="emerald"
        open={openSections.has("mustHaves")}
        onToggle={() => toggleSection("mustHaves")}
      >
        <div className="pt-3">
          <p className="text-xs text-gray-400 mb-3">Non-negotiable criteria every deal must satisfy before proceeding to diligence.</p>
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

      {/* 4 — Deal-Breakers */}
      <SectionCard
        id="dealBreakers"
        icon={<XCircle className="w-4 h-4 text-red-500" />}
        title="Deal-Breakers"
        badge={String(dealBreakers.length)}
        badgeColor="red"
        open={openSections.has("dealBreakers")}
        onToggle={() => toggleSection("dealBreakers")}
      >
        <div className="pt-3">
          <p className="text-xs text-gray-400 mb-3">Automatic disqualifiers — any match is an instant pass regardless of other merits.</p>
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

      {/* 5 — ESG & Values Criteria */}
      <SectionCard
        id="esg"
        icon={<Leaf className="w-4 h-4 text-violet-500" />}
        title="ESG & Values Criteria"
        open={openSections.has("esg")}
        onToggle={() => toggleSection("esg")}
      >
        <div className="pt-3">
          <p className="text-xs text-gray-400 mb-3">Standards a company must meet or commit to for alignment with your firm's values.</p>
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
        icon={<FileText className="w-4 h-4 text-gray-400" />}
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
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SectionCard({ icon, title, badge, badgeColor, open, onToggle, children }: SectionCardProps) {
  const badgeCls =
    badgeColor === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : badgeColor === "red"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-500";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        {icon}
        <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
        {badge && (
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mr-2", badgeCls)}>
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

interface TagFieldProps {
  label: string;
  items: string[];
  newValue: string;
  onNewValueChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  placeholder: string;
}

function TagField({ label, items, newValue, onNewValueChange, onAdd, onRemove, placeholder }: TagFieldProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full px-2.5 py-1"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-blue-400 hover:text-blue-700 leading-none ml-0.5"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 bg-white"
        />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
        >
          <Plus className="w-3.5 h-3.5" />Add
        </button>
      </div>
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

function BulletList({ items, onRemove, color, newValue, onNewValueChange, onAdd, placeholder }: BulletListProps) {
  const dotCls = color === "emerald" ? "bg-emerald-500" : color === "red" ? "bg-red-500" : "bg-violet-500";
  const rowCls =
    color === "emerald"
      ? "bg-emerald-50/60 border-emerald-100"
      : color === "red"
      ? "bg-red-50/60 border-red-100"
      : "bg-violet-50/60 border-violet-100";

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border group", rowCls)}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)} />
          <span className="flex-1 text-sm text-gray-800">{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
            aria-label={`Remove ${item}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 bg-white"
        />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition font-medium"
        >
          <Plus className="w-3.5 h-3.5" />Add
        </button>
      </div>
    </div>
  );
}
