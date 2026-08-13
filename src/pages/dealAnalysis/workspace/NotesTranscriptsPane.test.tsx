import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NotesTranscriptsPane } from "./NotesTranscriptsPane";

afterEach(cleanup);

describe("NotesTranscriptsPane", () => {
  it("renders all three disabled sections and the Founder/Customer/Expert question grid", () => {
    render(<NotesTranscriptsPane />);

    expect(screen.getByText("Analyst Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add note/i })).toBeDisabled();
    expect(screen.getByText("No notes logged yet")).toBeInTheDocument();

    expect(screen.getByText("Agent-Drafted Questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /draft questions/i })).toBeDisabled();
    expect(screen.getByText("Founder / Management")).toBeInTheDocument();
    expect(screen.getByText("Customer Reference")).toBeInTheDocument();
    expect(screen.getByText("Industry Expert")).toBeInTheDocument();
    expect(screen.getAllByText("No questions drafted yet")).toHaveLength(3);

    expect(screen.getByText("Interview Log")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log interview/i })).toBeDisabled();
    expect(screen.getByText("No interviews logged yet")).toBeInTheDocument();
  });
});
