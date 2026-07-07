import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { findSlot, type SlotComponent } from "./slot";

const Foo: SlotComponent = ({ children }) => <div data-testid="foo">{children}</div>;
Foo.displayName = "Parent.Foo";

const Bar: SlotComponent = ({ children }) => <div data-testid="bar">{children}</div>;
Bar.displayName = "Parent.Bar";

describe("findSlot", () => {
  it("returns the first child whose type.displayName matches", () => {
    const children = (
      <>
        <Foo>foo content</Foo>
        <Bar>bar content</Bar>
      </>
    );
    const slot = findSlot(children, "Parent.Foo");
    const { container } = render(<>{slot}</>);
    expect(container.querySelector('[data-testid="foo"]')?.textContent).toBe("foo content");
  });

  it("returns null when no child matches", () => {
    const children = <Foo>foo</Foo>;
    expect(findSlot(children, "Parent.Missing")).toBeNull();
  });

  it("skips fragments transparently", () => {
    const children = (
      <>
        <>
          <Bar>bar</Bar>
        </>
        <Foo>foo</Foo>
      </>
    );
    const slot = findSlot(children, "Parent.Foo");
    expect(slot).not.toBeNull();
  });
});
