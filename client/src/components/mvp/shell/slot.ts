import { Children, Fragment, isValidElement, type FC, type ReactElement, type ReactNode } from "react";

export type SlotComponent<P = { children?: ReactNode }> = FC<P> & { displayName?: string };

/**
 * Finds the first descendant element whose `type.displayName` matches `name`.
 * Walks fragments transparently. Returns null if no match.
 *
 * displayName-based dispatch (not identity match on `child.type ===
 * Slot`) so HMR component-identity resets and React.lazy do not break
 * slot resolution.
 */
export function findSlot(children: ReactNode, name: string): ReactElement | null {
  let found: ReactElement | null = null;
  const walk = (nodes: ReactNode): void => {
    Children.forEach(nodes, (child) => {
      if (found) return;
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        walk((child.props as { children?: ReactNode }).children);
        return;
      }
      const dn = (child.type as { displayName?: string }).displayName;
      if (dn === name) {
        found = child;
      }
    });
  };
  walk(children);
  return found;
}
