import { getTabContentKind } from "../tabContentKind";

describe("getTabContentKind", () => {
  it.each([
    [{}, "text"],
    [{ isRich: true }, "rich-text"],
    [{ isTablet: true }, "tablet"],
    [{ isRich: false, isTablet: false }, "text"],
  ] as const)("maps legacy flags %#", (tab, expected) => {
    expect(getTabContentKind(tab)).toBe(expected);
  });

  it.each(["text", "rich-text", "tablet", "canvas"] as const)(
    "gives the explicit %s kind precedence over legacy flags",
    (contentKind) => {
      expect(
        getTabContentKind({ contentKind, isRich: true, isTablet: true }),
      ).toBe(contentKind);
    },
  );
});
