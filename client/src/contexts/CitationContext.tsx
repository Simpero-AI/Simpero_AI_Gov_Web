import { createContext, useContext, useState, type ReactNode } from "react";
import type { Citation, Claim } from "@shared/simperoTypes";

export interface CitationData {
  /** Human-readable label for the field, e.g. "Revenue ARR" or "Pre-money Valuation" */
  fieldLabel: string;
  /**
   * null when the field is AI-synthesized/modeled with no source document reference.
   * The sidebar will explain what that means and show recommended verification steps.
   */
  citation: Citation | null;
}

interface CitationContextValue {
  active: CitationData | null;
  openCitation: (data: CitationData) => void;
  /** Convenience method — opens the sidebar directly from a per-sentence Claim object. */
  openClaimCitation: (claim: Claim, label?: string) => void;
  closeCitation: () => void;
  /** Company/deal name surfaced to the CitationSidebar for corroboration links. */
  companyName: string | null;
  setCompanyName: (name: string) => void;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export function CitationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<CitationData | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  return (
    <CitationContext.Provider
      value={{
        active,
        openCitation: setActive,
        openClaimCitation: (claim: Claim, label?: string) => {
          setActive({
            fieldLabel: label ?? `Source (p.${claim.citation.page ?? "?"})`,
            citation: claim.citation,
          });
        },
        closeCitation: () => setActive(null),
        companyName,
        setCompanyName,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
}

export function useCitation(): CitationContextValue {
  const ctx = useContext(CitationContext);
  if (!ctx) throw new Error("useCitation must be used inside CitationProvider");
  return ctx;
}

/** Safe version — returns null outside a provider (e.g. Storybook, tests). */
export function useCitationSafe(): CitationContextValue | null {
  return useContext(CitationContext);
}
