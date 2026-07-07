import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export interface MvpFundSelectorProps {
  /** Required for a11y, e.g. "Workspace selector". */
  "aria-label": string;
  className?: string;
}

const AUM_LABELS: Record<string, string> = {
  lt_100m: "Under $100M",
  "100_500m": "$100M–$500M",
  "500m_1b": "$500M–$1B",
  "1_5b": "$1B–$5B",
  gt_5b: "Over $5B",
};

export function MvpFundSelector({ className, ...rest }: MvpFundSelectorProps) {
  const { user } = useAuth();
  const profileQuery = trpc.investmentProfile.get.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const firmName = profileQuery.data?.firmName || "Simpero Fund III";
  // Prefer the free-text mandate.aum written by FirmProfileBlock; fall back to legacy aumBand enum.
  const mandateAum = (profileQuery.data?.mandate as Record<string, unknown> | undefined)?.aum;
  const aumDisplay =
    typeof mandateAum === "string" && mandateAum
      ? mandateAum
      : profileQuery.data?.aumBand
        ? (AUM_LABELS[profileQuery.data.aumBand] ?? profileQuery.data.aumBand)
        : "$450M · Vintage 2023";

  return (
    <div className={cn("px-3 py-3 border-b border-[color:var(--mvp-sidebar-border)]", className)}>
      <div
        aria-label={rest["aria-label"]}
        title="Multi-fund support is on the roadmap"
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 cursor-default"
      >
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold text-slate-200 truncate leading-tight">{firmName}</div>
          <div className="text-[10px] text-slate-500 truncate leading-tight">{aumDisplay}</div>
        </div>
      </div>
    </div>
  );
}
