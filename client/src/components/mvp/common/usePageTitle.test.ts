import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePageTitle } from "./usePageTitle";

const originalTitle = "test";

afterEach(() => {
  document.title = originalTitle;
});

describe("usePageTitle", () => {
  it("sets document.title to '<title> · Simpero' on mount", () => {
    renderHook(() => usePageTitle("Dashboard"));
    expect(document.title).toBe("Dashboard · Simpero");
  });

  it("restores prior document.title on unmount", () => {
    document.title = "previous";
    const { unmount } = renderHook(() => usePageTitle("Memo"));
    expect(document.title).toBe("Memo · Simpero");
    unmount();
    expect(document.title).toBe("previous");
  });

  it("updates document.title when the title argument changes", () => {
    const { rerender } = renderHook(({ t }: { t: string }) => usePageTitle(t), {
      initialProps: { t: "Dashboard" },
    });
    expect(document.title).toBe("Dashboard · Simpero");
    rerender({ t: "History" });
    expect(document.title).toBe("History · Simpero");
  });
});
