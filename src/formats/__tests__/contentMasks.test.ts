import { formatRegistry } from "../registry";

/**
 * This file deliberately imports only the registry, never `../index`, so no
 * format modules self-register and the mask list starts empty.
 */
describe("content masks", () => {
  it("returns content unchanged when nothing is registered", () => {
    expect(formatRegistry.applyContentMasks("untouched")).toBe("untouched");
  });

  it("applies a registered mask", () => {
    const mask = (content: string) => content.replace("secret", "");
    formatRegistry.registerContentMask(mask);

    expect(formatRegistry.applyContentMasks("a secret b")).toBe("a  b");
  });

  it("composes masks, feeding each the previous result", () => {
    const first = (content: string) => `${content}-one`;
    const second = (content: string) => `${content}-two`;

    formatRegistry.registerContentMask(first);
    formatRegistry.registerContentMask(second);

    expect(formatRegistry.applyContentMasks("start")).toContain("-one-two");
  });

  it("registers the same mask only once", () => {
    const append = (content: string) => `${content}!`;

    formatRegistry.registerContentMask(append);
    formatRegistry.registerContentMask(append);
    formatRegistry.registerContentMask(append);

    const applied = formatRegistry.applyContentMasks("x");
    expect(applied.split("!").length - 1).toBe(1);
  });

  it("keeps going when a mask throws", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const boom = () => {
      throw new Error("bad mask");
    };
    const good = (content: string) => `${content}-ok`;

    formatRegistry.registerContentMask(boom);
    formatRegistry.registerContentMask(good);

    // The throwing mask contributes nothing rather than taking detection down
    expect(formatRegistry.applyContentMasks("x")).toContain("-ok");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
