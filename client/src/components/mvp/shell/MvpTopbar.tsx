import { useEffect, type FC, type ReactNode } from "react";
import { Bell, Search } from "lucide-react";
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
  Subtitle: typeof Subtitle;
  Actions: typeof Actions;
  QuickSearch: typeof QuickSearch;
  Notifications: typeof Notifications;
  Avatar: typeof AvatarSlot;
} = ({ children, className }) => {
  const breadcrumb = findSlot(children, "MvpTopbar.Breadcrumb");
  const subtitle = findSlot(children, "MvpTopbar.Subtitle");
  const actions = findSlot(children, "MvpTopbar.Actions");
  const quickSearch = findSlot(children, "MvpTopbar.QuickSearch");
  const notifications = findSlot(children, "MvpTopbar.Notifications");
  const avatar = findSlot(children, "MvpTopbar.Avatar");

  // dev-only warning for Subtitle without Breadcrumb
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && subtitle && !breadcrumb) {
      console.warn("[MvpTopbar] <MvpTopbar.Subtitle> used without a sibling <MvpTopbar.Breadcrumb>");
    }
  }, [breadcrumb, subtitle]);

  return (
    <div className={cn("h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200 shadow-sm", className)}>
      <div className="min-w-0 flex items-center gap-2.5">
        {breadcrumb}
        {subtitle}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {quickSearch}
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
MvpTopbar.Subtitle = Subtitle;
MvpTopbar.Actions = Actions;
MvpTopbar.QuickSearch = QuickSearch;
MvpTopbar.Notifications = Notifications;
MvpTopbar.Avatar = AvatarSlot;
