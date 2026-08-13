import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldValueList } from "./FieldValueList";

afterEach(cleanup);

describe("FieldValueList", () => {
  it("renders each field/value pair, plus an optional badge/hint", () => {
    render(
      <FieldValueList
        items={[
          { id: "1", field: "Founded", value: "2019" },
          { id: "2", field: "HQ", value: "Austin, TX", hint: "Relocated in 2022", badge: <span>Verified</span> },
        ]}
      />
    );
    expect(screen.getByText("Founded")).toBeInTheDocument();
    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Relocated in 2022")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
});
