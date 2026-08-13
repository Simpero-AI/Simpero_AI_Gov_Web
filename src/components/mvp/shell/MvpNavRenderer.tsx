import type { ReactNode } from "react";
import { MvpSidebarDivider } from "./MvpSidebarDivider";
import { MvpSidebarGroup } from "./MvpSidebarGroup";
import { MvpSidebarItem } from "./MvpSidebarItem";
import { MvpSidebarSubNav } from "./MvpSidebarSubNav";
import type { MvpNavModel, MvpNavGroup, MvpNavLeaf, MvpNavSubNav } from "@/components/mvp/nav/mvpNav";

export interface MvpNavRendererProps {
  nav: MvpNavModel;
}

/**
 * Renders the divider/group/leaf/subnav nav model. Pages call this inside
 * <MvpSidebar> after the <MvpFundSelector>. Centralises the loop that
 * was previously duplicated across 9 pages.
 */
export function MvpNavRenderer({ nav }: MvpNavRendererProps) {
  return (
    <>
      {nav.map((divider) => {
        const body = divider.children.map((child) => renderNode(child));
        // "Deal Flow" is the one top-level section that collapses in the
        // mockup — MvpSidebarGroup already is a collapsible titled
        // container, so it doubles as the collapsible divider here instead
        // of introducing a separate component.
        return divider.collapsible ? (
          <MvpSidebarGroup key={divider.title} title={divider.title}>
            {body}
          </MvpSidebarGroup>
        ) : (
          <MvpSidebarDivider key={divider.title} title={divider.title}>
            {body}
          </MvpSidebarDivider>
        );
      })}
    </>
  );
}

function renderNode(node: MvpNavGroup | MvpNavLeaf | MvpNavSubNav): ReactNode {
  if (node.kind === "group") {
    return (
      <MvpSidebarGroup key={node.title} title={node.title}>
        {node.items.map((leaf) => renderLeaf(leaf))}
      </MvpSidebarGroup>
    );
  }
  if (node.kind === "subnav") {
    return <MvpSidebarSubNav key={node.key} nav={node} />;
  }
  return renderLeaf(node);
}

function renderLeaf(leaf: MvpNavLeaf): ReactNode {
  return (
    <MvpSidebarItem
      key={leaf.key}
      href={leaf.href}
      label={leaf.label}
      icon={leaf.icon}
      meta={leaf.meta}
      badge={leaf.badge}
      count={leaf.count}
      disabled={leaf.disabled}
      disabledReason={leaf.disabledReason}
    />
  );
}
