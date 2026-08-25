import {
  BAND_GAP_PX,
  CARD_PADDING_PX,
  TITLE_FONT_PX,
  computeCardLayout,
  composeWheelImage,
  drawWinnerOverlay,
  fitText,
} from "../wheelImageComposer";

function createMockCtx() {
  return {
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    save: jest.fn(),
    restore: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    drawImage: jest.fn(),
    measureText: jest.fn((text: string) => ({ width: text.length * 10 })),
  } as unknown as CanvasRenderingContext2D & {
    fillRect: jest.Mock;
    fillText: jest.Mock;
    drawImage: jest.Mock;
    measureText: jest.Mock;
  };
}

describe("computeCardLayout", () => {
  it("is a bare card when there is no title", () => {
    const layout = computeCardLayout(400);

    expect(layout.width).toBe(400 + CARD_PADDING_PX * 2);
    expect(layout.height).toBe(400 + CARD_PADDING_PX * 2);
    expect(layout.titleCenterY).toBeNull();
    expect(layout.wheelX).toBe(CARD_PADDING_PX);
    expect(layout.wheelY).toBe(CARD_PADDING_PX);
    expect(layout.wheelSize).toBe(400);
  });

  it("reserves a title band above the wheel", () => {
    const layout = computeCardLayout(200, { title: "My Wheel" });

    expect(layout.titleCenterY).not.toBeNull();
    expect(layout.wheelY).toBe(
      CARD_PADDING_PX + TITLE_FONT_PX + BAND_GAP_PX,
    );
    expect(layout.height).toBe(
      layout.wheelY + 200 + CARD_PADDING_PX,
    );
  });

  it("ignores blank titles and winner labels", () => {
    expect(computeCardLayout(100, { title: "   " }).titleCenterY).toBeNull();
    expect(computeCardLayout(100, { title: "" }).titleCenterY).toBeNull();
  });

  it("does not reserve space for a winner — it is overlaid on the wheel", () => {
    const withoutWinner = computeCardLayout(300);
    const withWinner = computeCardLayout(300, { winnerLabel: "Alice" });

    expect(withWinner.height).toBe(withoutWinner.height);
    expect(withWinner.wheelSize).toBe(withoutWinner.wheelSize);
  });
});

describe("fitText", () => {
  it("keeps the base size when the text fits", () => {
    // measure = text.length * 10 → 5 chars at 30px = 50 ≤ 100
    expect(fitText("short", 1000, (text) => text.length * 10)).toEqual({
      text: "short",
      fontSize: TITLE_FONT_PX,
    });
  });

  it("shrinks until the text fits, respecting a custom base size", () => {
    const result = fitText(
      "averyverylongtext",
      100,
      (text, fontPx) => text.length * fontPx,
      40,
    );
    expect(result.fontSize).toBeLessThanOrEqual(40);
    expect(result.fontSize).toBeGreaterThanOrEqual(16);
  });
});

describe("drawWinnerOverlay", () => {
  it("draws a 'Winner' caption above the name (with !), in white, at the wheel centre", () => {
    const ctx = createMockCtx();

    drawWinnerOverlay(ctx, "Charlie", 250, 250, 400);

    const calls = ctx.fillText.mock.calls as [string, number, number][];
    const caption = calls.find(([text]) => text === "Winner");
    const name = calls.find(([text]) => text === "Charlie!");

    expect(caption).toBeDefined();
    expect(name).toBeDefined();
    // Both lines are centred horizontally and straddle the vertical centre.
    expect(caption![1]).toBe(250);
    expect(name![1]).toBe(250);
    expect(caption![2]).toBeLessThan(250);
    expect(name![2]).toBeGreaterThan(250);
    expect(ctx.fillStyle).toBe("#ffffff");
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("scales font with the wheel and shrinks for long names", () => {
    // Measure grows with both text length and font size, like a real canvas.
    const ctx = createMockCtx();
    const lastFontPx = () => {
      const match = /(\d+)px/.exec(ctx.font);
      return parseInt(match![1], 10);
    };
    ctx.measureText.mockImplementation((text: string) => ({
      width: text.length * lastFontPx() * 0.5,
    }));

    drawWinnerOverlay(ctx, "Charlie", 0, 0, 400);
    const shortSize = lastFontPx();

    drawWinnerOverlay(ctx, "Alexandra-Constantinople", 0, 0, 400);
    const longSize = lastFontPx();

    expect(shortSize).toBeGreaterThan(longSize);
    expect(longSize).toBeGreaterThanOrEqual(16 + 2);
  });
});

describe("composeWheelImage", () => {
  it("paints the background then draws the wheel at the layout position", () => {
    const ctx = createMockCtx();
    const wheel = {} as CanvasImageSource;

    composeWheelImage(ctx, wheel, { wheelSize: 250 });

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 250 + CARD_PADDING_PX * 2, 250 + CARD_PADDING_PX * 2);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const [source, x, y, w, h] = ctx.drawImage.mock.calls[0];
    expect(source).toBe(wheel);
    expect(x).toBe(CARD_PADDING_PX);
    expect(y).toBe(CARD_PADDING_PX);
    expect(w).toBe(250);
    expect(h).toBe(250);
  });

  it("draws the title centred when provided", () => {
    const ctx = createMockCtx();

    composeWheelImage(ctx, {} as CanvasImageSource, { wheelSize: 100, title: "Team Lunch" });

    expect(ctx.fillText).toHaveBeenCalledWith("Team Lunch", expect.any(Number), expect.any(Number));
    expect(ctx.textAlign).toBe("center");
  });

  it("overlays 'Winner' + name (with !) in white on the wheel centre", () => {
    const ctx = createMockCtx();

    composeWheelImage(ctx, {} as CanvasImageSource, { wheelSize: 200, winnerLabel: "Bob" });

    const texts = (ctx.fillText.mock.calls as [string][]).map(([t]) => t);
    expect(texts).toContain("Winner");
    expect(texts).toContain("Bob!");
    expect(ctx.fillStyle).toBe("#ffffff");
  });

  it("omits title and winner text when not provided", () => {
    const ctx = createMockCtx();

    composeWheelImage(ctx, {} as CanvasImageSource, { wheelSize: 100 });

    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
