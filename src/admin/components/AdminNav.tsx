import { Building2, ListChecks, Mail, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "../adminRoutes";
import { useAdminContext } from "../hooks/useAdminContext";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Capability-driven nav item list — deliberately hand-rolled rather than
 * reusing MvpSidebarItem/buildMvpNav (plan discrepancy #2: those are
 * product-shell-coupled). Hrefs are the absolute /admin/... paths, matching
 * the full pathname react-router reports (there is no nest base to strip).
 */
function navItemsFor(isPlatformAdmin: boolean, isOrgAdmin: boolean): NavItem[] {
  const items: NavItem[] = [];
  if (isPlatformAdmin) {
    items.push({ href: ADMIN_ROUTES.organizations, label: "Organizations", icon: Building2 });
    items.push({ href: ADMIN_ROUTES.mandateTaxonomy, label: "Mandate Taxonomy", icon: ListChecks });
  }
  if (isOrgAdmin) {
    items.push({ href: ADMIN_ROUTES.members, label: "Members", icon: Users });
    items.push({ href: ADMIN_ROUTES.invitations, label: "Invitations", icon: Mail });
  }
  return items;
}

export function AdminNav() {
  const { isPlatformAdmin, isOrgAdmin } = useAdminContext();
  const { pathname } = useLocation();
  const items = navItemsFor(isPlatformAdmin, isOrgAdmin);

  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 px-2.5 py-3">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            to={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
