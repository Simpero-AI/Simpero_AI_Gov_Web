import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { INVESTMENT_PROFILE_QUERY_KEY } from "@/api/investmentProfile";
import { toast } from "@/components/mvp/primitives/sonner";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { MANDATE_DEFAULTS, type InvestmentProfile } from "@/data/mandateDefaults";
import { SimperoMarkIcon } from "@/components/mvp/icons";

interface Props {
  profile: InvestmentProfile | null;
  saveRef?: React.MutableRefObject<(() => void) | null>;
  /** Fires whenever local dirty/saving state changes — lets the page-level
   * topbar show a real save-status indicator instead of a fabricated one. */
  onStateChange?: (state: { dirty: boolean; saving: boolean }) => void;
}

function getStr(obj: Record<string, unknown>, key: string, fallback = ""): string {
  const v = obj[key];
  return typeof v === "string" && v ? v : fallback;
}

const inp =
  "w-full rounded-lg border border-[color:var(--rev-border-strong)] bg-[color:var(--rev-surface)] px-3 py-2 text-sm text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)] focus:outline-none focus:ring-2 focus:ring-[color:var(--rev-primary)]";
const lbl =
  "block font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--rev-text-6)] mb-1.5";

export function FirmProfileBlock({ profile, saveRef, onStateChange }: Props) {
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
      toast.success("Firm profile saved.");
    },
    onError: (err) => toast.error(err.message),
  });

  const hydratedRef = useRef<string | null>(null);

  const [firmName, setFirmName] = useState(() => profile?.firmName ?? "");
  const [firmType, setFirmType] = useState(() => getStr(profile?.mandate ?? {}, "firmTypeFreeText"));
  const [aum, setAum] = useState(() => getStr(profile?.mandate ?? {}, "aum"));
  const [fundVintage, setFundVintage] = useState(() => getStr(profile?.mandate ?? {}, "fundVintage"));
  const [hqLocation, setHqLocation] = useState(() => getStr(profile?.mandate ?? {}, "hqLocation"));
  const [investmentThesis, setInvestmentThesis] = useState(() => getStr(profile?.mandate ?? {}, "investmentThesis"));

  useEffect(() => {
    const key = profile ? String(profile.updatedAt) : "null";
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;
    const m = profile?.mandate ?? {};
    setFirmName(profile?.firmName ?? "");
    setFirmType(getStr(m, "firmTypeFreeText"));
    setAum(getStr(m, "aum"));
    setFundVintage(getStr(m, "fundVintage"));
    setHqLocation(getStr(m, "hqLocation"));
    setInvestmentThesis(getStr(m, "investmentThesis"));
    setIsDirty(false);
  }, [profile]);

  const doSave = useCallback(() => {
    upsertMutation.mutate({
      firmName: firmName.trim() || null,
      mandate: { firmTypeFreeText: firmType, aum, fundVintage, hqLocation, investmentThesis },
    });
  }, [firmName, firmType, aum, fundVintage, hqLocation, investmentThesis, upsertMutation]);

  useEffect(() => {
    if (saveRef) saveRef.current = doSave;
  }, [saveRef, doSave]);

  useEffect(() => {
    onStateChange?.({ dirty: isDirty, saving: upsertMutation.isPending });
  }, [isDirty, upsertMutation.isPending, onStateChange]);

  const m = profile?.mandate ?? {};
  // checkSize is now stored as numeric checkMin/checkMax (see EditableMandateBlock) —
  // derive the same display string here rather than parsing the old free-text field.
  const checkMin = typeof m.checkMin === "number" ? m.checkMin : MANDATE_DEFAULTS.checkMinK;
  const checkMax = typeof m.checkMax === "number" ? m.checkMax : MANDATE_DEFAULTS.checkMaxK;
  const checkSize = `$${checkMin}K–$${checkMax}K`;
  const targetReturn = getStr(m, "targetReturn", MANDATE_DEFAULTS.targetReturn);
  const holdPeriod = getStr(m, "holdPeriod", MANDATE_DEFAULTS.holdPeriod);

  return (
    <div className="space-y-4">
      {/* FIRM IDENTITY */}
      <div className="rounded-xl border border-[color:var(--rev-border)] bg-[color:var(--rev-surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-5 flex items-center gap-3.5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: "linear-gradient(140deg, #3B6FF5, #2F5FEA)" }}
          >
            <SimperoMarkIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.075em] text-[color:var(--rev-text-6)]">
            Firm Identity
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label className={lbl}>Firm Name</label>
            <input className={inp} value={firmName} onChange={(e) => { setFirmName(e.target.value); setIsDirty(true); }} placeholder="e.g. Vistara Growth Partners" />
          </div>
          <div>
            <label className={lbl}>Firm Type</label>
            <input className={inp} value={firmType} onChange={(e) => { setFirmType(e.target.value); setIsDirty(true); }} placeholder="e.g. Growth Equity & Structured Capital" />
          </div>
          <div>
            <label className={lbl}>AUM</label>
            <input className={inp} value={aum} onChange={(e) => { setAum(e.target.value); setIsDirty(true); }} placeholder="e.g. $700M+" />
          </div>
          <div>
            <label className={lbl}>Fund Vintage</label>
            <input className={inp} value={fundVintage} onChange={(e) => { setFundVintage(e.target.value); setIsDirty(true); }} placeholder="e.g. Fund V (2023)" />
          </div>
          <div className="col-span-2">
            <label className={lbl}>HQ Location</label>
            <input className={inp} value={hqLocation} onChange={(e) => { setHqLocation(e.target.value); setIsDirty(true); }} placeholder="e.g. Vancouver, BC · Palo Alto, CA" />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Investment Thesis & Description</label>
            <Textarea
              value={investmentThesis}
              onChange={(e) => { setInvestmentThesis(e.target.value); setIsDirty(true); }}
              rows={4}
              className="resize-none text-sm"
              placeholder="Describe your firm's investment thesis and approach…"
            />
          </div>
        </div>
      </div>

      {/* FIRM SUMMARY dark card — same gradient treatment as MandateScorecard's
          Investment Mandate Summary banner, for visual consistency across the
          page rather than a one-off dark card. */}
      <div className="rounded-xl p-5" style={{ background: "var(--rev-mandate-gradient)" }}>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm leading-none text-[#8FB4FF]">★</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.075em] text-[#8FB4FF]">Firm Summary</span>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">Firm Name</p>
            <p className="text-sm font-semibold text-white">{firmName || "—"}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">Type</p>
            <p className="text-sm font-semibold text-white">{firmType || "—"}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">AUM</p>
            <p className="text-sm font-semibold text-white">{aum || "—"}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">Check Size</p>
            <p className="text-sm font-semibold text-white">{checkSize}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">Target Return</p>
            <p className="text-sm font-semibold text-white">{targetReturn}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#7F8B98]">Hold Period</p>
            <p className="text-sm font-semibold text-white">{holdPeriod}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
