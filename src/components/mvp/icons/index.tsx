/**
 * Hand-extracted SVG glyphs from the design-revamp mockup
 * (`Meridian Diligence.dc.html`) — the ~10 "identity-critical" icons the
 * icon-strategy decision (docs/plans/2026-08-12-web-design-revamp.md §5)
 * calls out for custom extraction rather than a lucide-react substitute.
 * Everything else in the redesign uses lucide-react directly.
 *
 * Deliberately minimal props (`className` only, no ref forwarding, no
 * `size`/`strokeWidth`) — these are decorative, fixed-geometry glyphs, not a
 * general icon system. `stroke="currentColor"` so text-color utilities on
 * the wrapping element control their color, matching how `MvpSidebarItem`
 * already colors lucide icons.
 */

export interface MvpIconProps {
  className?: string;
}

/** Simpero hexagon logo mark (mockup lines ~30-31, sidebar header). */
export function SimperoMarkIcon({ className }: MvpIconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 1.3L18 5.8V14.2L10 18.7L2 14.2V5.8L10 1.3Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M10 1.3V18.7M2 5.8L18 14.2M18 5.8L2 14.2M10 1.3L2 5.8M10 1.3L18 5.8M10 18.7L2 14.2M10 18.7L18 14.2"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * Family Office group identity glyph — the mockup's "Data Consolidation"
 * leaf icon (~line 42), which is also that group's sole destination.
 */
export function FamilyOfficeIcon({ className }: MvpIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <circle cx="4.8" cy="4.8" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.2" cy="4.8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.8" cy="11.6" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.2" cy="11.6" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.3 6L9.7 10.4M9.8 6.3L6.4 10.1" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

/**
 * Deal Flow group identity glyph — the mockup's "Deals" leaf icon
 * (~line 52), the group's primary/first destination.
 */
export function DealFlowIcon({ className }: MvpIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Intelligence group identity glyph — the mockup's "Institutional Memory"
 * leaf icon (~line 82), the group's sole (nested) destination.
 */
export function IntelligenceIcon({ className }: MvpIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 2.5H11L13 4.5V13.5C13 13.78 12.78 14 12.5 14H3.5C3.22 14 3 13.78 3 13.5V2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M5.5 6.5H10.5M5.5 9H10.5M5.5 11.5H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
