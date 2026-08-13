import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DataRoomPane } from "./DataRoomPane";
import { buildE2eDeliverableMemo } from "@shared/e2eUxMemoFixture";

afterEach(cleanup);

describe("DataRoomPane", () => {
  it("shows an empty state and a disabled Add document button when the deal has no file", () => {
    render(<DataRoomPane memoTyped={null} />);
    expect(screen.getByText("No documents on file for this deal")).toBeInTheDocument();
    expect(screen.getByText("0 documents on file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
  });

  it("shows the real filename with an honest 'status not tracked' pill when the deal has a file, and keeps Add document disabled", () => {
    const memo = buildE2eDeliverableMemo();
    render(<DataRoomPane memoTyped={memo} />);

    expect(screen.getByText(memo.fileName!)).toBeInTheDocument();
    expect(screen.getByText("Status not tracked")).toBeInTheDocument();
    expect(screen.getByText("1 document on file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add document/i })).toBeDisabled();
    expect(screen.queryByText("No documents on file for this deal")).not.toBeInTheDocument();
  });
});
