import { useEffect, type FC, type ReactNode } from "react";
import { Bell, History, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { findSlot, type SlotComponent } from "./slot";
import { Breadcrumb as CommonBreadcrumb } from "@/components/mvp/common/Breadcrumb";

type SlotProps = { children?: ReactNode };

interface BreadcrumbSlotProps {
  segments: string[];
}
const BreadcrumbSlot: SlotComponent<BreadcrumbSlotProps> = ({ segments }) => {
  // Two-line layout: first segment as breadcrumb label, last as page title
  const breadcrumbLabel = segments.slice(0, -1).join(" / ");
  const pageTitle = segments[segments.length - 1] ?? "";
  return (
    <div>
      {breadcrumbLabel ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 leading-none mb-0.5">
          {breadcrumbLabel}
        </p>
      ) : null}
      <p className="text-sm font-semibold text-gray-900 leading-tight">{pageTitle}</p>
    </div>
  );
};
BreadcrumbSlot.displayName = "MvpTopbar.Breadcrumb";

/**
 * The mockup's "Deals" topbar variant has no two-line breadcrumb+title —
 * just a single mono uppercase eyebrow (e.g. "Portfolio · Q2 2026"). Use
 * this instead of `Breadcrumb` for that variant; other variants keep using
 * `Breadcrumb`/`Subtitle` until their own phase restyles them.
 */
const Eyebrow: SlotComponent<SlotProps> = ({ children }) => (
  <p className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--rev-text-6)] leading-none">
    {children}
  </p>
);
Eyebrow.displayName = "MvpTopbar.Eyebrow";

const Subtitle: SlotComponent<SlotProps> = ({ children }) => (
  <>
    <span className="text-gray-300" aria-hidden="true">·</span>
    <span aria-hidden="true" className="hidden sm:inline truncate font-mono text-xs text-gray-400 max-w-[40ch]">
      {children}
    </span>
  </>
);
Subtitle.displayName = "MvpTopbar.Subtitle";

const Actions: SlotComponent<SlotProps> = ({ children }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);
Actions.displayName = "MvpTopbar.Actions";

interface QuickSearchProps {
  onOpen?: () => void;
  "aria-label": string;
}
const QuickSearch: SlotComponent<QuickSearchProps> = ({ onOpen, ...rest }) => (
  <button
    type="button"
    aria-label={rest["aria-label"]}
    onClick={onOpen}
    className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition"
  >
    <Search className="w-3.5 h-3.5" aria-hidden="true" />
    <span>Quick search</span>
    <kbd aria-hidden="true" className="ml-1 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-400">
      ⌘K
    </kbd>
  </button>
);
QuickSearch.displayName = "MvpTopbar.QuickSearch";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label": string;
}
/**
 * A real search field — the mockup's "Deals" topbar variant (search input,
 * not a "Quick search ⌘K" trigger). Prepared for the near-future Deals-page
 * rewrite (plan Phase 3); not wired into any page in this task.
 */
const SearchInput: SlotComponent<SearchInputProps> = ({ value, onChange, placeholder, ...rest }) => (
  <div className="relative flex items-center">
    <Search className="pointer-events-none absolute left-[11px] h-3.5 w-3.5 text-[#9AA1AC]" aria-hidden="true" />
    <input
      type="search"
      aria-label={rest["aria-label"]}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-[260px] rounded-lg border border-[#E1E4E9] bg-[#F7F8FA] py-2 pl-[33px] pr-3 text-[13px] text-[color:var(--rev-text-2)] placeholder:text-[color:var(--rev-text-7)]"
    />
  </div>
);
SearchInput.displayName = "MvpTopbar.SearchInput";

export type MandateSaveState = "saved" | "saving" | "unsaved";

const SAVE_STATE_CONFIG: Record<MandateSaveState, { dot: string; label: string }> = {
  saved: { dot: "var(--rev-success)", label: "Saved" },
  saving: { dot: "var(--rev-warning)", label: "Saving…" },
  unsaved: { dot: "var(--rev-text-7)", label: "Unsaved changes" },
};

interface MandateMetaProps {
  /** Real dirty/saving state lifted from the three mandate blocks — never fabricated. */
  saveState: MandateSaveState;
  onOpenHistory: () => void;
  firm?: string;
  aum?: string;
}
/**
 * The mockup's "Mandate" topbar variant: save-status dot+label, a History
 * drawer trigger, and firm/AUM context — all in the left title cluster,
 * mirroring the mockup's single-row layout (docs/plans/2026-08-12-web-
 * design-revamp.md Phase 7).
 */
const MandateMeta: SlotComponent<MandateMetaProps> = ({ saveState, onOpenHistory, firm, aum }) => {
  const cfg = SAVE_STATE_CONFIG[saveState];
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: cfg.dot }}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} aria-hidden="true" />
        {cfg.label}
      </span>
      <span className="text-[color:var(--rev-border-strong)]" aria-hidden="true">·</span>
      <button
        type="button"
        onClick={onOpenHistory}
        className="flex items-center gap-1 font-mono text-[11px] text-[color:var(--rev-text-5)] hover:text-[color:var(--rev-text-2)]"
      >
        <History className="h-3 w-3" aria-hidden="true" />
        History
      </button>
      {firm || aum ? (
        <>
          <span className="text-[color:var(--rev-border-strong)]" aria-hidden="true">·</span>
          <span className="hidden font-mono text-[11px] text-[color:var(--rev-text-6)] sm:inline">
            {[firm, aum].filter(Boolean).join(" · ")}
          </span>
        </>
      ) : null}
    </div>
  );
};
MandateMeta.displayName = "MvpTopbar.MandateMeta";

interface NotificationsProps {
  count?: number;
  "aria-label": string;
}
const Notifications: SlotComponent<NotificationsProps> = ({ count, ...rest }) => (
  <button
    type="button"
    aria-label={rest["aria-label"]}
    className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
  >
    <Bell className="w-4 h-4" aria-hidden="true" />
    {count && count > 0 ? (
      <span
        className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold leading-none"
        aria-hidden="true"
      >
        {count}
      </span>
    ) : null}
  </button>
);
Notifications.displayName = "MvpTopbar.Notifications";

interface AvatarProps {
  initial: string;
  name?: string;
  role?: string;
  "aria-label": string;
}
const AvatarSlot: SlotComponent<AvatarProps> = ({ initial, name, role, ...rest }) => (
  <button
    type="button"
    aria-label={rest["aria-label"]}
    className="flex items-center gap-2"
  >
    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
      {initial}
    </div>
    {(name || role) ? (
      <div className="hidden sm:block text-left">
        {name ? <p className="text-xs font-semibold text-gray-700 leading-none">{name}</p> : null}
        {role ? <p className="text-[10px] text-gray-400 leading-none mt-0.5">{role}</p> : null}
      </div>
    ) : null}
  </button>
);
AvatarSlot.displayName = "MvpTopbar.Avatar";

export interface MvpTopbarProps {
  children: ReactNode;
  className?: string;
}

export const MvpTopbar: FC<MvpTopbarProps> & {
  Breadcrumb: typeof BreadcrumbSlot;
  Eyebrow: typeof Eyebrow;
  Subtitle: typeof Subtitle;
  Actions: typeof Actions;
  QuickSearch: typeof QuickSearch;
  SearchInput: typeof SearchInput;
  Notifications: typeof Notifications;
  Avatar: typeof AvatarSlot;
  MandateMeta: typeof MandateMeta;
} = ({ children, className }) => {
  const breadcrumb = findSlot(children, "MvpTopbar.Breadcrumb");
  const eyebrow = findSlot(children, "MvpTopbar.Eyebrow");
  const subtitle = findSlot(children, "MvpTopbar.Subtitle");
  const actions = findSlot(children, "MvpTopbar.Actions");
  const quickSearch = findSlot(children, "MvpTopbar.QuickSearch");
  const searchInput = findSlot(children, "MvpTopbar.SearchInput");
  const notifications = findSlot(children, "MvpTopbar.Notifications");
  const avatar = findSlot(children, "MvpTopbar.Avatar");
  const mandateMeta = findSlot(children, "MvpTopbar.MandateMeta");

  // dev-only warning for Subtitle without Breadcrumb
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && subtitle && !breadcrumb) {
      console.warn("[MvpTopbar] <MvpTopbar.Subtitle> used without a sibling <MvpTopbar.Breadcrumb>");
    }
  }, [breadcrumb, subtitle]);

  return (
    <div
      className={cn(
        "h-[62px] flex items-center justify-between gap-4 px-[26px] bg-[color:var(--rev-surface)] border-b border-[color:var(--rev-border-strong)]",
        className
      )}
    >
      <div className="min-w-0 flex items-center gap-2.5">
        {breadcrumb}
        {eyebrow}
        {subtitle}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {searchInput}
        {quickSearch}
        {mandateMeta}
        {notifications}
        {avatar ? (
          <>
            <div className="w-px h-5 bg-gray-200 mx-1" aria-hidden="true" />
            {avatar}
          </>
        ) : null}
      </div>
    </div>
  );
};

MvpTopbar.Breadcrumb = BreadcrumbSlot;
MvpTopbar.Eyebrow = Eyebrow;
MvpTopbar.Subtitle = Subtitle;
MvpTopbar.Actions = Actions;
MvpTopbar.QuickSearch = QuickSearch;
MvpTopbar.SearchInput = SearchInput;
MvpTopbar.Notifications = Notifications;
MvpTopbar.Avatar = AvatarSlot;
MvpTopbar.MandateMeta = MandateMeta;
