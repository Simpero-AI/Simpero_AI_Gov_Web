import { cn } from "@/lib/utils";
import type { MetricValue } from "@shared/simperoTypes";
import { ProvenanceGlyph } from "./ProvenanceGlyph";
import { CitationRef } from "./CitationRef";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/mvp/primitives/hover-card";

export interface HeaderLineSecondary {
  value: number;
  prefix?: string;
  suffix?: string;
}

export interface HeaderLineProps {
  label: string;
  /** Primary metric (e.g. valuationPostUsd). Optional. */
  primary?: MetricValue;
  /** Secondary value to appear after primary (e.g. " ($Y pre-money)" or " for 8.5% equity"). */
  secondary?: HeaderLineSecondary;
  /** Formatter for the primary value (input unit depends on field). */
  primaryFormat: (value: number) => string;
  /** Static text to append after the primary value (e.g. "post-money"). */
  primarySuffix?: string;
  /** Formatter for the secondary value, if a custom one is needed. Defaults to no formatting. */
  secondaryFormat?: (value: number) => string;
  /** Label affordance when both halves missing (e.g. "Not extracted"). */
  emptyAffordance: string;
  /** Called when user clicks the citation link on the primary value. */
  onPrimaryCitationClick?: () => void;
  className?: string;
}

/**
 * IC Memo header line component. Always renders the labeled line —
 * never silently omits — so analysts see the system attempted extraction
 * even when no value was found.
 */
export function HeaderLine({
  label,
  primary,
  secondary,
  primaryFormat,
  primarySuffix,
  secondaryFormat,
  emptyAffordance,
  onPrimaryCitationClick,
  className,
}: HeaderLineProps) {
  const hasAny = primary !== undefined || secondary !== undefined;

  return (
    <p className={cn("text-sm leading-relaxed", className)}>
      <strong className="text-slate-700">{label}:</strong>{" "}
      {!hasAny ? (
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <span className="cursor-help rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {emptyAffordance}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-72 text-xs">
            <p className="font-medium text-slate-700">Not extracted</p>
            <p className="mt-1 text-slate-500">
              Neither the financial model nor the source materials carried this
              figure. The analyst can fill it in manually (coming soon).
            </p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <span className="text-slate-900">
          {primary ? (
            <>
              <span className="font-semibold tabular-nums">{primaryFormat(primary.value)}</span>
              {primarySuffix && <span className="text-slate-600"> {primarySuffix}</span>}
              <ProvenanceGlyph source={primary.source} />
              {primary.citation && (
                <CitationRef
                  page={primary.citation.page ?? null}
                  section={primary.citation.section ?? null}
                  verified={!!primary.citation.verified}
                  onClick={onPrimaryCitationClick ?? (() => {})}
                  className="ml-1"
                />
              )}
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
          {secondary && (
            <span className="text-slate-700">
              {secondary.prefix ?? " "}
              <span className="tabular-nums">
                {secondaryFormat ? secondaryFormat(secondary.value) : secondary.value}
              </span>
              {secondary.suffix ?? ""}
            </span>
          )}
        </span>
      )}
    </p>
  );
}
