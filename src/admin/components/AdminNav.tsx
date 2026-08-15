import { Building2, ListChecks, Mail, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAdminContext } from "../hooks/useAdminContext";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Capability-driven nav item list — deliberately hand-rolled rather than
 * reusing MvpSidebarItem/buildMvpNav (plan discrepancy #2: those are
 * product-shell-coupled). Hrefs are relative to the /admin nest base.
 */
function navItemsFor(isPlatformAdmin: boolean, isOrgAdmin: boolean): NavItem[] {
  const items: NavItem[] = [];
  if (isPlatformAdmin) {
    items.push({ href: "/organizations", label: "Organizations", icon: Building2 });
    items.push({ href: "/mandate-taxonomy", label: "Mandate Taxonomy", icon: ListChecks });
  }
  if (isOrgAdmin) {
    items.push({ href: "/members", label: "Members", icon: Users });
    items.push({ href: "/invitations", label: "Invitations", icon: Mail });
  }
  return items;
}

export function AdminNav() {
  const { isPlatformAdmin, isOrgAdmin } = useAdminContext();
  const [location] = useLocation();
  const items = navItemsFor(isPlatformAdmin, isOrgAdmin);

  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 px-2.5 py-3">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = location === href || location.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
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
