import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { CitationRef } from "./CitationRef";

afterEach(cleanup);

describe("CitationRef", () => {
  it("renders 'p.{page}' label for verified citation", () => {
    render(<CitationRef page={12} section="Deal Terms" verified={true} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /p\.12/ })).toBeInTheDocument();
  });

  it("uses citation-badge class for verified", () => {
    render(<CitationRef page={12} section={null} verified={true} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveClass("citation-badge");
  });

  it("uses unverified styling when verified=false", () => {
    render(<CitationRef page={null} section={null} verified={false} onClick={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/red/); // amber/red color signals unverified
  });

  it("calls onClick when activated", () => {
    const onClick = vi.fn();
    render(<CitationRef page={12} section={null} verified={true} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders nothing when page is null and verified", () => {
    // No page reference to show — but we keep the button as null-render to keep layout
    const { container } = render(<CitationRef page={null} section={null} verified={true} onClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
