import { useEffect } from "react";

/**
 * Sets document.title to `${title} · Simpero` on mount and restores the
 * previous title on unmount. Updates if the title argument changes.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const prior = document.title;
    document.title = `${title} · Simpero`;
    return () => {
      document.title = prior;
    };
  }, [title]);
}
