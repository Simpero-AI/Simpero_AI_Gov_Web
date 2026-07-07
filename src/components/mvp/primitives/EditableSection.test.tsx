import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { EditableSection } from "./EditableSection";

afterEach(cleanup);

describe("EditableSection", () => {
  it("renders children + Edit pencil", () => {
    render(
      <EditableSection
        sectionLabel="Risk Register"
        onRegenerate={() => {}}
        onEditText={() => {}}
      >
        <div>section content</div>
      </EditableSection>,
    );
    expect(screen.getByText("section content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("opens the popover when pencil is clicked", () => {
    render(
      <EditableSection
        sectionLabel="Risk Register"
        onRegenerate={() => {}}
        onEditText={() => {}}
      >
        <div>content</div>
      </EditableSection>,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText(/regenerate/i)).toBeVisible();
    expect(screen.getByText(/edit text/i)).toBeVisible();
  });

  it("fires onRegenerate with the optional steering note", () => {
    const onRegenerate = vi.fn();
    render(
      <EditableSection
        sectionLabel="Risk Register"
        onRegenerate={onRegenerate}
        onEditText={() => {}}
      >
        <div>content</div>
      </EditableSection>,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByPlaceholderText(/optional steering/i), {
      target: { value: "Focus on regulatory risk" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^regenerate$/i }));
    expect(onRegenerate).toHaveBeenCalledWith("Focus on regulatory risk");
  });
});
