import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { INVESTMENT_PROFILE_QUERY_KEY } from "@/api/investmentProfile";
import { toast } from "@/components/mvp/primitives/sonner";
import { Textarea } from "@/components/mvp/primitives/textarea";
import { MANDATE_DEFAULTS, type InvestmentProfile } from "@/data/mandateDefaults";

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
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 bg-white";
const lbl = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5";

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
  const checkSize = getStr(m, "checkSize", MANDATE_DEFAULTS.checkSize);
  const targetReturn = getStr(m, "targetReturn", MANDATE_DEFAULTS.targetReturn);
  const holdPeriod = getStr(m, "holdPeriod", MANDATE_DEFAULTS.holdPeriod);

  return (
    <div className="space-y-4">
      {/* FIRM IDENTITY */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Firm Identity</span>
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

      {/* FIRM SUMMARY dark card */}
      <div className="bg-gray-900 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-amber-400 text-sm leading-none">★</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Firm Summary</span>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Firm Name</p>
            <p className="text-sm font-semibold text-white">{firmName || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Type</p>
            <p className="text-sm font-semibold text-white">{firmType || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">AUM</p>
            <p className="text-sm font-semibold text-white">{aum || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Check Size</p>
            <p className="text-sm font-semibold text-white">{checkSize}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Target Return</p>
            <p className="text-sm font-semibold text-white">{targetReturn}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Hold Period</p>
            <p className="text-sm font-semibold text-white">{holdPeriod}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
