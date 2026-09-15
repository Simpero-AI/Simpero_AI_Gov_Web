// One shared trust-status pill for every claims-driven analysis surface
// (Company / Market / Financials / Summary). Consolidated from three divergent
// per-tab pills so the SAME status always reads identically across tabs, and so
// the full corroboration ladder is shown honestly:
//
//   verified            -> green   (externally corroborated)
//   partially_verified  -> amber   (internally verified, NOT externally corroborated)
//   conflicted          -> red     (an external source disagrees)
//   inconclusive        -> neutral (low-confidence, neither way)
//   cited               -> blue    (cited, not yet verified)
//   derived             -> neutral (classifier-derived, e.g. sector/HQ)
//
// The previous pills coloured only `verified` green and collapsed everything else
// into one neutral gray, so partial/cited/conflicted were indistinguishable and
// conflicted read like a downgrade rather than a flag. The `title` gives the plain
// meaning on hover (esp. "Partial" = internally verified, not a failure).

type PillStyle = { label: string; color: string; tint: string; title: string };

const TRUST_STATUS_STYLE: Record<string, PillStyle> = {
  verified: {
    label: "Verified",
    color: "var(--rev-success)",
    tint: "var(--rev-tint-success)",
    title: "Externally corroborated against an independent source (e.g. SEC EDGAR).",
  },
  partially_verified: {
    label: "Partial",
    color: "var(--rev-warning)",
    tint: "var(--rev-tint-warning)",
    title: "Internally verified against the source document, but not externally corroborated.",
  },
  conflicted: {
    label: "Conflicted",
    color: "var(--rev-danger)",
    tint: "var(--rev-tint-danger)",
    title: "An external source disagrees with this figure — review before relying on it.",
  },
  inconclusive: {
    label: "Inconclusive",
    color: "var(--rev-text-6)",
    tint: "var(--rev-tint-neutral)",
    title: "Low-confidence — neither corroborated nor contradicted by an external source.",
  },
  cited: {
    label: "Cited",
    color: "var(--rev-primary)",
    tint: "var(--rev-tint-primary)",
    title: "Cited from a source, not yet independently verified.",
  },
  derived: {
    label: "Derived",
    color: "var(--rev-text-6)",
    tint: "var(--rev-tint-neutral)",
    title: "Derived by the classifier, not a directly cited claim.",
  },
};

// Unknown runtime status (a backend rename ahead of a deploy) still renders its
// raw value legibly in the neutral pill rather than a blank.
function styleFor(status: string): PillStyle {
  return (
    TRUST_STATUS_STYLE[status] ?? {
      label: status,
      color: "var(--rev-text-6)",
      tint: "var(--rev-tint-neutral)",
      title: status,
    }
  );
}

export function TrustStatusPill({ status }: { status: string }) {
  const s = styleFor(status);
  return (
    <span
      title={s.title}
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.5px]"
      style={{ color: s.color, background: s.tint }}
    >
      {s.label}
    </span>
  );
}
