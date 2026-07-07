import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { Pass2QualitySummary } from "@shared/simperoTypes";
import { cn } from "@/lib/utils";
import { getPass2BannerUserSummary } from "@/lib/pass2QualityUserMessage";

type Props = {
  quality: Pass2QualitySummary;
  /** Full memo UI: show acknowledgment controls below the banner. */
  variant: "editor" | "shared";
  className?: string;
  /** Rendered only when variant is editor (e.g. checkbox + button). */
  children?: ReactNode;
};

export function Pass2LowConfidenceBanner({ quality, variant, className, children }: Props) {
  if (!quality.lowConfidenceWarning || !quality.message?.trim()) {
    return null;
  }

  const userSummary = getPass2BannerUserSummary(quality);

  return (
    <div
      className={cn(
        "mx-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3",
        variant === "shared" ? "mt-3" : "mt-4",
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="text-sm font-semibold text-amber-400">Citation verification — review before reliance</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{userSummary}</p>
          <details className="mt-3 group">
            <summary className="text-xs text-amber-200/80 cursor-pointer select-none hover:underline list-none [&::-webkit-details-marker]:hidden flex items-center gap-1">
              <span className="inline-block transition-transform group-open:rotate-90 text-amber-400/90">▸</span>
              Technical details
            </summary>
            <div className="mt-2 pl-3 border-l border-amber-500/30 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{quality.message}</p>
              <p className="text-[11px] text-muted-foreground/80 font-mono">
                mode={quality.mode} · pending_after_pass1={quality.pendingAfterPass1} · verified_by_pass2=
                {quality.verifiedByPass2}
              </p>
            </div>
          </details>
        </div>
        {variant === "editor" && children}
      </div>
    </div>
  );
}
