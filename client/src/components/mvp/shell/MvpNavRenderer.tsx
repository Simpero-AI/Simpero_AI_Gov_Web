import { MvpSidebarDivider } from "./MvpSidebarDivider";
import { MvpSidebarGroup } from "./MvpSidebarGroup";
import { MvpSidebarItem } from "./MvpSidebarItem";
import type { MvpNavModel, MvpNavGroup, MvpNavLeaf } from "@/components/mvp/nav/mvpNav";

export interface MvpNavRendererProps {
  nav: MvpNavModel;
}

/**
 * Renders the divider/group/leaf nav model. Pages call this inside
 * <MvpSidebar> after the <MvpFundSelector>. Centralises the loop that
 * was previously duplicated across 9 pages.
 */
export function MvpNavRenderer({ nav }: MvpNavRendererProps) {
  return (
    <>
      {nav.map((divider) => (
        <MvpSidebarDivider key={divider.title} title={divider.title}>
          {divider.children.map((child) =>
            isGroup(child) ? (
              <MvpSidebarGroup key={child.title} title={child.title}>
                {child.items.map((leaf) => (
                  <MvpSidebarItem
                    key={leaf.key}
                    href={leaf.href}
                    label={leaf.label}
                    icon={leaf.icon}
                    meta={leaf.meta}
                    badge={leaf.badge}
                    disabled={leaf.disabled}
                  />
                ))}
              </MvpSidebarGroup>
            ) : (
              <MvpSidebarItem
                key={child.key}
                href={child.href}
                label={child.label}
                icon={child.icon}
                meta={child.meta}
                badge={child.badge}
                disabled={child.disabled}
              />
            )
          )}
        </MvpSidebarDivider>
      ))}
    </>
  );
}

function isGroup(node: MvpNavGroup | MvpNavLeaf): node is MvpNavGroup {
  return node.kind === "group";
}
