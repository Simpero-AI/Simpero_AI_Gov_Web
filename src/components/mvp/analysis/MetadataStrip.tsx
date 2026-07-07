/**
 * Header strip rendered above the /analysis tab bar.
 *
 * Surfaces a compact summary of memo-level metadata so analysts can verify
 * which artifact they are reviewing without leaving the diligence workspace.
 * Optional fields (documentType, resolvedJurisdiction) are simply omitted when
 * the upstream pipeline didn't resolve them.
 */
import type { LucideIcon } from "lucide-react";
import { FileText, Calendar, MapPin, Tag, CheckCircle, AlertTriangle } from "lucide-react";
import type { ICMemoResult } from "@shared/simperoTypes";

export interface MetadataStripProps {
  memo: ICMemoResult;
}

export function MetadataStrip({ memo }: MetadataStripProps) {
  const processedAt = new Date(memo.processedAt).toLocaleDateString();
  const lowConfidence = memo.pass2Quality?.lowConfidenceWarning === true;
  const warningText =
    memo.pass2Quality?.message ??
    "Low verification confidence — many claims could not be matched to source passages";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <Pill icon={FileText} label={memo.fileName} title={memo.fileName} />
        <Pill icon={FileText} label={`${memo.pageCount} pages`} />
        <Pill icon={Calendar} label={`Processed ${processedAt}`} />
        {memo.documentType ? <Pill icon={Tag} label={memo.documentType} /> : null}
        {memo.resolvedJurisdiction ? (
          <Pill icon={MapPin} label={memo.resolvedJurisdiction} />
        ) : null}
        <Pill
          icon={CheckCircle}
          label={`${memo.scorecard.matchRate}% verified (${memo.scorecard.claimsMatched}/${memo.scorecard.claimsExtracted})`}
        />
      </div>
      {lowConfidence && (
        <div className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{warningText}</span>
        </div>
      )}
    </div>
  );
}

interface PillProps {
  icon: LucideIcon;
  label: string;
  title?: string;
}

function Pill({ icon: Icon, label, title }: PillProps) {
  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
