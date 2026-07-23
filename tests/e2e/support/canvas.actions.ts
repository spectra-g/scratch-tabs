import { expect, Page } from "@playwright/test";

const CANVAS_FEATURE_SETTING_KEY = "features.canvas.enabled";
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

interface BrowserMonacoEditor {
  getDomNode(): HTMLElement | null;
  setValue(value: string): void;
}

interface BrowserMonacoWindow extends Window {
  monaco?: {
    editor: {
      getEditors(): BrowserMonacoEditor[];
    };
  };
}

export class CanvasActions {
  private lastDocumentId: string | null = null;
  private pendingSaveRevision = 0;
  private pendingPaneSaveRevision: Partial<Record<"left" | "right", number>> =
    {};
  private rememberedBounds: Record<
    "x" | "y" | "width" | "height",
    number
  > | null = null;
  private operationBounds: {
    before: Record<"x" | "y" | "width" | "height", number>;
    after: Record<"x" | "y" | "width" | "height", number>;
  } | null = null;
  private duplicatedSourceBounds = new Map<
    string,
    Record<"x" | "y" | "width" | "height", number>
  >();
  private sequentialTraversal: Record<"forward" | "backward", string[]> = {
    forward: [],
    backward: [],
  };
  private exitedCanvasAtBoundary: Record<"forward" | "backward", boolean> = {
    forward: false,
    backward: false,
  };
  private zoomBeforeOffscreenNavigation: string | null = null;
  private keyboardNudgeBounds: Array<{
    before: Record<"x" | "y" | "width" | "height", number>;
    after: Record<"x" | "y" | "width" | "height", number>;
  }> = [];
  private keyboardViewportCommandsCompleted = false;
  private shortcutEditingGuardCompleted = false;
  private openedCodeSource: string | null = null;
  private imageAssetId: string | null = null;

  constructor(private page: Page) {}

  private async primaryShortcut(key: string) {
    const isMac = await this.page.evaluate(() =>
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform),
    );
    return `${isMac ? "Meta" : "Control"}+${key}`;
  }

  async enableFeature() {
    await this.page.goto(process.env.BASE_URL ?? "http://localhost:5173/");
    await expect(this.page.getByText("SCRATCH_TABS")).toBeVisible();
    await this.page.evaluate(async (settingKey) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        const transaction = database.transaction("settings", "readwrite");
        transaction.objectStore("settings").put({
          key: settingKey,
          value: "true",
        });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    }, CANVAS_FEATURE_SETTING_KEY);
  }

  async useDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 800 });
  }

  async useNarrowViewport() {
    await this.page.setViewportSize({ width: 700, height: 800 });
  }

  async useWideSplitViewport() {
    await this.page.setViewportSize({ width: 1800, height: 900 });
  }

  async createCanvas() {
    const button = this.page.getByTestId("icon-new-canvas");
    await expect(button).toBeVisible();
    await button.click();
  }

  private saveStatus() {
    return this.page.getByTestId("canvas-save-status");
  }

  private textCard() {
    return this.page.locator('[data-item-type="text"]').first();
  }

  private textCardContaining(text: string) {
    return this.page
      .locator('[data-item-type="text"]')
      .filter({ hasText: text });
  }

  private codeCard() {
    return this.page.locator('[data-item-type="code"]').first();
  }

  private imageCard() {
    return this.page.locator('[data-item-type="image"]').first();
  }

  private async readBounds(card: ReturnType<Page["locator"]>) {
    const readNumber = async (attribute: string) =>
      Number(await card.getAttribute(`data-${attribute}`));
    return {
      x: await readNumber("x"),
      y: await readNumber("y"),
      width: await readNumber("width"),
      height: await readNumber("height"),
    };
  }

  private async areAllCanvasCardsVisible() {
    const canvasBox = await this.page.getByTestId("canvas-flow").boundingBox();
    if (!canvasBox) return false;

    const cards = this.page.locator("[data-item-id]");
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const cardBox = await cards.nth(index).boundingBox();
      if (
        !cardBox ||
        cardBox.x < canvasBox.x - 1 ||
        cardBox.y < canvasBox.y - 1 ||
        cardBox.x + cardBox.width > canvasBox.x + canvasBox.width + 1 ||
        cardBox.y + cardBox.height > canvasBox.y + canvasBox.height + 1
      ) {
        return false;
      }
    }
    return count > 0;
  }

  private async moveCardBy(text: string, deltaX: number, deltaY: number) {
    const card = this.textCardContaining(text).first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + deltaX,
      box!.y + box!.height / 2 + deltaY,
      { steps: 8 },
    );
    await this.page.mouse.up();
  }

  private async focusedCardName() {
    const label = await this.page
      .locator('[data-item-id][data-focused="true"]')
      .getAttribute("aria-label");
    return label?.replace(/^Text card,?\s*/, "") ?? "";
  }

  private pane(side: "left" | "right") {
    return this.page.locator(`[data-editor-pane-side="${side}"]`);
  }

  private paneSaveStatus(side: "left" | "right") {
    return this.pane(side).getByTestId("canvas-save-status");
  }

  private async markPendingSceneChange() {
    const revision = await this.saveStatus().getAttribute("data-save-revision");
    this.pendingSaveRevision = Number(revision ?? "0");
  }

  async addTextCard(text: string) {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-add-text").click();
    const editor = this.page.getByTestId("canvas-text-editor");
    await expect(editor).toBeVisible();
    await editor.fill(text);
    await editor.press("Control+Enter");
  }

  async addCodeCard(source: string) {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-add-code").click();
    const editor = this.page.getByTestId("canvas-code-editor");
    await expect(editor).toBeVisible();
    await editor.fill(source);
    await editor.press("Control+Enter");
    await expect(this.codeCard()).toHaveAttribute("data-editing", "false");
  }

  async addImageCard() {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-image-input").setInputFiles({
      name: "architecture.png",
      mimeType: "image/png",
      buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"),
    });
    const card = this.imageCard();
    const error = this.page.getByTestId("canvas-image-error");
    await expect(card.or(error)).toBeVisible();
    if (await error.isVisible()) {
      throw new Error(
        `Canvas rejected the test image: ${await error.textContent()}`,
      );
    }
    await expect(card).toHaveAttribute("data-asset-status", "ready");
    this.imageAssetId = await card.getAttribute("data-asset-id");
    expect(this.imageAssetId).toBeTruthy();
  }

  async replaceImageCard() {
    const card = this.imageCard();
    const previousAssetId = await card.getAttribute("data-asset-id");
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-image-replace-input").setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"),
    });
    await expect
      .poll(() => card.getAttribute("data-asset-id"))
      .not.toBe(previousAssetId);
    await this.waitForSceneSave();
    this.imageAssetId = await card.getAttribute("data-asset-id");
  }

  async chooseUnsupportedImage() {
    await this.page.getByTestId("canvas-image-input").setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image", "utf8"),
    });
  }

  async expectImageRejected() {
    await expect(this.page.getByTestId("canvas-image-error")).toContainText(
      "Choose a PNG, JPEG, GIF, WebP, BMP, ICO, or SVG image.",
    );
    await expect(this.page.locator('[data-item-type="image"]')).toHaveCount(0);
  }

  async expectImageRestored() {
    const card = this.imageCard();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-width", "160");
    await expect(card).toHaveAttribute("data-height", "160");
    await expect(card).toHaveAttribute("data-asset-status", "ready");
    await expect(this.page.getByTestId("canvas-image-rendered")).toBeVisible();
    const assetId = await card.getAttribute("data-asset-id");
    const dimensions = await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction("canvasAssets", "readonly");
        const record = await new Promise<
          { width?: number; height?: number } | undefined
        >((resolve, reject) => {
          const request = transaction.objectStore("canvasAssets").get(id!);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return record ? { width: record.width, height: record.height } : null;
      } finally {
        database.close();
      }
    }, assetId);
    expect(dimensions).toEqual({ width: 1, height: 1 });
  }

  async openImageInSmartView() {
    await this.page.getByTestId("canvas-image-open").click();
    await expect(this.page.getByTestId("image-smart-view")).toBeVisible();
    await expect(
      this.page.locator(
        '[data-testid="tab-replacement.png"][aria-selected="true"]',
      ),
    ).toBeVisible();
  }

  async removeImageAssetFromStorage() {
    const assetId = await this.imageCard().getAttribute("data-asset-id");
    expect(assetId).toBeTruthy();
    await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction("canvasAssets", "readwrite");
        transaction.objectStore("canvasAssets").delete(id!);
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    }, assetId);
  }

  async expectMissingImagePlaceholder() {
    await expect(this.imageCard()).toHaveAttribute(
      "data-asset-status",
      "error",
    );
    const placeholder = this.page.getByTestId("canvas-image-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(
      "Use Replace to recover this card.",
    );
  }

  async formatAndConfigureCodeCard() {
    await this.page.getByTestId("canvas-code-format").click();
    await this.page.getByTestId("canvas-code-wrap").click();
    await this.page.getByTestId("canvas-code-collapse").click();
  }

  async expectFormattedCodeCardAfterReload() {
    const card = this.codeCard();
    await expect(card).toHaveAttribute("data-language", "json");
    await expect(card).toHaveAttribute("data-language-locked", "true");
    await expect(card).toHaveAttribute("data-wrap", "true");
    await expect(card).toHaveAttribute("data-collapsed", "true");
    await expect(card).toHaveAttribute("data-height", "40");
    await this.page.getByTestId("canvas-code-collapse").click();
    await expect(card).toHaveAttribute("data-height", "320");
    await expect(this.page.getByTestId("canvas-code-preview")).toHaveText(
      '{\n  "users": [\n    {\n      "id": 1\n    }\n  ]\n}',
    );
  }

  async expectCodeLanguageAndEscapedRendering(language: string) {
    const card = this.codeCard();
    await expect(card).toHaveAttribute("data-language", language);
    await expect(this.page.getByTestId("canvas-code-preview")).toContainText(
      "<strong>",
    );
    await expect(card.locator("strong")).toHaveCount(0);
    await expect(card.locator(".monaco-editor")).toHaveCount(0);
  }

  async openCodeCardInTextTab() {
    this.openedCodeSource = await this.page
      .getByTestId("canvas-code-preview")
      .textContent();
    await this.page.getByTestId("canvas-code-open-tab").click();
    await expect(
      this.page.locator(
        '[data-testid="tab-JSON from Canvas"][aria-selected="true"]',
      ),
    ).toBeVisible();
  }

  async editOpenedCodeTabWithoutChangingCanvas() {
    const selector = '[data-editor-pane-side="left"] .monaco-editor';
    await expect(this.page.locator(selector).first()).toBeVisible();
    await this.page.waitForFunction((cssSelector) => {
      const container = document.querySelector(cssSelector);
      return (window as BrowserMonacoWindow).monaco?.editor
        ?.getEditors()
        .some((editor) => container?.contains(editor.getDomNode()));
    }, selector);
    await this.page.evaluate((cssSelector) => {
      const container = document.querySelector(cssSelector);
      const editor = (window as BrowserMonacoWindow).monaco?.editor
        .getEditors()
        .find((candidate) => container?.contains(candidate.getDomNode()));
      editor?.setValue('{"changedOutsideCanvas":true}');
    }, selector);
    await this.page.getByTestId("tab-Canvas 1").click();
  }

  async expectCanvasCodeUnchanged() {
    expect(this.openedCodeSource).toBeTruthy();
    await expect(this.page.getByTestId("canvas-code-preview")).toHaveText(
      this.openedCodeSource!,
    );
    await expect(
      this.page.getByTestId("canvas-code-preview"),
    ).not.toContainText("changedOutsideCanvas");
  }

  async multiSelectTextCards(firstText: string, secondText: string) {
    const first = this.textCardContaining(firstText).first();
    const second = this.textCardContaining(secondText).first();
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();

    if ((await second.getAttribute("aria-selected")) !== "true") {
      await second.click();
    }
    await first.click({ modifiers: ["Shift"] });

    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(
      this.page.getByTestId("canvas-selection-toolbar"),
    ).toContainText("2 selected");
  }

  async duplicateSelection(texts: string[]) {
    this.duplicatedSourceBounds.clear();
    for (const text of texts) {
      this.duplicatedSourceBounds.set(
        text,
        await this.readBounds(this.textCardContaining(text).first()),
      );
    }
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-duplicate-selection").click();
  }

  async duplicateCurrentSelection() {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-duplicate-selection").click();
  }

  async expectOffsetDuplicatesSelected(texts: string[]) {
    await expect(
      this.page.locator('[data-item-type="text"][aria-selected="true"]'),
    ).toHaveCount(texts.length);

    for (const text of texts) {
      const matches = this.textCardContaining(text);
      await expect(matches).toHaveCount(2);
      const duplicate = this.page
        .locator('[data-item-type="text"][aria-selected="true"]')
        .filter({ hasText: text });
      await expect(duplicate).toHaveCount(1);
      const sourceBounds = this.duplicatedSourceBounds.get(text);
      expect(sourceBounds).toBeTruthy();
      const duplicateBounds = await this.readBounds(duplicate);
      expect(duplicateBounds.x).toBe(sourceBounds!.x + 32);
      expect(duplicateBounds.y).toBe(sourceBounds!.y + 32);
      expect(duplicateBounds.width).toBe(sourceBounds!.width);
      expect(duplicateBounds.height).toBe(sourceBounds!.height);
    }
  }

  async moveSelectedCard() {
    const card = this.page
      .locator('[data-item-type="text"][aria-selected="true"]')
      .first();
    await expect(card).toBeVisible();
    const before = await this.readBounds(card);
    await this.markPendingSceneChange();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + 120,
      box!.y + box!.height / 2 + 80,
      { steps: 8 },
    );
    await this.page.mouse.up();
    const after = await this.readBounds(card);
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
    this.operationBounds = { before, after };
  }

  async resizeSelectedCard() {
    const card = this.page
      .locator('[data-item-type="text"][aria-selected="true"]')
      .first();
    await expect(card).toBeVisible();
    const before = await this.readBounds(card);
    const resizeHandle = this.page
      .locator(".react-flow__resize-control.handle.bottom.right")
      .first();
    await expect(resizeHandle).toBeVisible();
    const box = await resizeHandle.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + 80,
      box!.y + box!.height / 2 + 60,
      {
        steps: 8,
      },
    );
    await this.page.mouse.up();
    const after = await this.readBounds(card);
    expect(after.width).not.toBe(before.width);
    expect(after.height).not.toBe(before.height);
    this.operationBounds = { before, after };
  }

  async undoOperation() {
    await this.page.getByTestId("canvas-undo").click();
  }

  async redoOperation() {
    await this.page.getByTestId("canvas-redo").click();
  }

  async expectOperationBounds(state: "before" | "after") {
    expect(this.operationBounds).toBeTruthy();
    const expectedBounds = this.operationBounds![state];
    const card = this.page.locator('[data-item-type="text"]').first();
    await expect(card).toBeVisible();
    for (const [name, expected] of Object.entries(expectedBounds)) {
      await expect
        .poll(async () => Number(await card.getAttribute(`data-${name}`)))
        .toBeCloseTo(expected, 3);
    }
  }

  async deleteSelectionFromToolbar() {
    await this.page.getByTestId("canvas-delete-selection").click();
  }

  async expectTextCardCount(count: number) {
    await expect(this.page.locator('[data-item-type="text"]')).toHaveCount(
      count,
    );
  }

  async expectUndoHistoryEmpty() {
    await expect(this.page.getByTestId("canvas-undo")).toBeDisabled();
    await expect(this.page.getByTestId("canvas-redo")).toBeDisabled();
  }

  async addTextCardInPane(text: string, side: "left" | "right") {
    const pane = this.pane(side);
    const status = this.paneSaveStatus(side);
    this.pendingPaneSaveRevision[side] = Number(
      (await status.getAttribute("data-save-revision")) ?? "0",
    );
    await pane.getByTestId("canvas-add-text").click();
    const editor = pane.getByTestId("canvas-text-editor");
    await expect(editor).toBeVisible();
    await editor.fill(text);
    await editor.press("Control+Enter");
  }

  async waitForPaneSceneSave(side: "left" | "right") {
    const status = this.paneSaveStatus(side);
    const previousRevision = this.pendingPaneSaveRevision[side] ?? 0;
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(previousRevision);
    await expect(status).toHaveAttribute("data-save-state", "saved");
  }

  async waitForSceneSave() {
    const status = this.saveStatus();
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(this.pendingSaveRevision);
    await expect(status).toHaveAttribute("data-save-state", "saved");
  }

  async moveAndResizeTextCard() {
    const card = this.textCard();
    await expect(card).toBeVisible();

    await this.markPendingSceneChange();
    const cardBox = await card.boundingBox();
    expect(cardBox).toBeTruthy();
    await this.page.mouse.move(
      cardBox!.x + cardBox!.width / 2,
      cardBox!.y + cardBox!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      cardBox!.x + cardBox!.width / 2 + 110,
      cardBox!.y + cardBox!.height / 2 + 70,
      { steps: 8 },
    );
    await this.page.mouse.up();
    await this.waitForSceneSave();

    await card.click();
    const resizeHandle = this.page
      .locator(".react-flow__resize-control.handle.bottom.right")
      .first();
    await expect(resizeHandle).toBeVisible();
    await this.markPendingSceneChange();
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).toBeTruthy();
    await this.page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 90,
      handleBox!.y + handleBox!.height / 2 + 60,
      { steps: 8 },
    );
    await this.page.mouse.up();
  }

  async rememberTextCardBounds() {
    const card = this.textCard();
    const readNumber = async (attribute: string) =>
      Number(await card.getAttribute(`data-${attribute}`));
    this.rememberedBounds = {
      x: await readNumber("x"),
      y: await readNumber("y"),
      width: await readNumber("width"),
      height: await readNumber("height"),
    };
    Object.values(this.rememberedBounds).forEach((value) =>
      expect(Number.isFinite(value)).toBe(true),
    );
  }

  async expectRememberedTextCardBounds() {
    expect(this.rememberedBounds).toBeTruthy();
    const card = this.textCard();
    await expect(card).toBeVisible();
    for (const [name, expectedValue] of Object.entries(
      this.rememberedBounds!,
    )) {
      await expect
        .poll(async () => Number(await card.getAttribute(`data-${name}`)))
        .toBeCloseTo(expectedValue, 3);
    }
  }

  async deleteTextCard() {
    const card = this.textCard();
    await card.click();
    await this.markPendingSceneChange();
    await this.page.keyboard.press("Delete");
    await expect(card).not.toBeAttached();
  }

  async expectTextCard(text: string) {
    const card = this.textCard();
    await expect(card).toBeVisible();
    await expect(card).toContainText(text);
    await expect(card).toHaveAttribute("aria-selected", /true|false/);
    await expect(card).toHaveAttribute("data-item-id", /.+/);
  }

  async expectTextCardInPane(text: string, side: "left" | "right") {
    const card = this.pane(side).locator('[data-item-type="text"]').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(text);
  }

  async expectIndependentSplitStatusContributions() {
    const leftStatus = this.paneSaveStatus("left");
    const rightStatus = this.paneSaveStatus("right");
    await expect(leftStatus).toBeVisible();
    await expect(rightStatus).toBeVisible();
    const leftTabId = await leftStatus.getAttribute("data-renderer-tab-id");
    const rightTabId = await rightStatus.getAttribute("data-renderer-tab-id");
    expect(leftTabId).toBeTruthy();
    expect(rightTabId).toBeTruthy();
    expect(leftTabId).not.toBe(rightTabId);
    await expect(leftStatus).toContainText("1 item");
    await expect(rightStatus).toContainText("1 item");
  }

  async expectNoCards() {
    await expect(this.page.locator("[data-item-id]")).toHaveCount(0);
  }

  async createKeyboardNavigationLayout() {
    for (const text of [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ]) {
      await this.addTextCard(text);
    }
    await this.moveCardBy("Top right", 70, 0);
  }

  async focusCanvasCard(text: string) {
    const card = this.textCardContaining(text).first();
    await card.focus();
    await expect(card).toHaveAttribute("data-focused", "true");
    await expect(card).toHaveAttribute("aria-selected", "true");
  }

  async pressCanvasKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async createTwoCardsWithKeyboard() {
    const addButton = this.page.getByTestId("canvas-add-text");
    await addButton.focus();
    for (const text of ["Keyboard first", "Keyboard second"]) {
      await this.page.keyboard.press("Enter");
      const editor = this.page.getByTestId("canvas-text-editor");
      await expect(editor).toBeFocused();
      await this.page.keyboard.type(text);
      await this.page.keyboard.press("Control+Enter");
      await addButton.focus();
    }
  }

  async selectAllCardsWithKeyboard() {
    await this.focusCanvasCard("Keyboard first");
    await this.page.keyboard.press(await this.primaryShortcut("a"));
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(2);
    await expect(
      this.page.getByTestId("canvas-navigation-announcement"),
    ).toHaveText("2 cards selected");
  }

  async nudgeSelectionWithKeyboard() {
    const selected = this.page.locator('[data-item-id][aria-selected="true"]');
    const count = await selected.count();
    const before = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        this.readBounds(selected.nth(index)),
      ),
    );
    await this.page.keyboard.press("Alt+ArrowRight");
    await this.page.keyboard.press("Alt+Shift+ArrowDown");
    const after = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        this.readBounds(selected.nth(index)),
      ),
    );
    this.keyboardNudgeBounds = before.map((bounds, index) => ({
      before: bounds,
      after: after[index],
    }));
  }

  async duplicateSelectionWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("d"));
  }

  async deleteSelectionWithKeyboard() {
    await this.page.keyboard.press("Delete");
  }

  async undoWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("z"));
  }

  async redoWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("Shift+z"));
  }

  async expectKeyboardNudgeDistances() {
    expect(this.keyboardNudgeBounds).toHaveLength(2);
    for (const { before, after } of this.keyboardNudgeBounds) {
      expect(after.x).toBe(before.x + 10);
      expect(after.y).toBe(before.y + 100);
    }
  }

  async expectSelectedCardCount(count: number) {
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(count);
  }

  async exerciseKeyboardViewportCommands() {
    await this.addTextCard("Viewport near");
    await this.addTextCard("Viewport far");
    await this.moveCardBy("Viewport far", 1000, 350);
    await this.focusCanvasCard("Viewport near");
    await this.page.keyboard.press(await this.primaryShortcut("a"));

    const canvas = this.page.getByTestId("canvas-flow");
    const initialZoom = Number(await canvas.getAttribute("data-canvas-zoom"));
    await this.page.keyboard.press("f");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .not.toBeCloseTo(initialZoom, 3);

    await this.page.keyboard.press("0");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .toBeCloseTo(1, 3);

    await expect(canvas).toHaveAttribute("data-canvas-selected-tool", "select");
    await this.page.keyboard.down("Space");
    await expect(canvas).toHaveAttribute("data-canvas-active-tool", "pan");
    await expect(canvas).toHaveAttribute("data-canvas-pan-active", "true");

    const pane = this.page.locator(".react-flow__pane");
    const paneBox = await pane.boundingBox();
    expect(paneBox).toBeTruthy();
    const beforeX = Number(await canvas.getAttribute("data-canvas-viewport-x"));
    await this.page.mouse.move(
      paneBox!.x + paneBox!.width * 0.75,
      paneBox!.y + paneBox!.height * 0.75,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      paneBox!.x + paneBox!.width * 0.75 - 80,
      paneBox!.y + paneBox!.height * 0.75 - 40,
      { steps: 6 },
    );
    await this.page.mouse.up();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-canvas-viewport-x")),
      )
      .not.toBeCloseTo(beforeX, 3);

    await this.page.keyboard.up("Space");
    await expect(canvas).toHaveAttribute("data-canvas-active-tool", "select");
    await expect(canvas).toHaveAttribute("data-canvas-selected-tool", "select");

    await this.page.keyboard.press("Escape");
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    const zoomIn = this.page.getByTitle("Zoom in");
    await zoomIn.click();
    await zoomIn.click();
    await canvas.focus();
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    const zoomBeforeFitAll = Number(
      await canvas.getAttribute("data-canvas-zoom"),
    );
    await this.page.keyboard.press("f");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .not.toBeCloseTo(zoomBeforeFitAll, 3);
    await expect.poll(() => this.areAllCanvasCardsVisible()).toBe(true);

    await zoomIn.click();
    await canvas.focus();
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    await this.page.keyboard.press("0");
    await expect.poll(() => this.areAllCanvasCardsVisible()).toBe(true);
    this.keyboardViewportCommandsCompleted = true;
  }

  async exerciseShortcutHelpAndEditingGuard() {
    await this.addTextCard("Shortcut guard");
    await this.focusCanvasCard("Shortcut guard");
    await this.page.keyboard.press("?");
    const help = this.page.getByTestId("canvas-shortcut-help");
    await expect(help).toBeVisible();
    await expect(
      this.page.getByTestId("canvas-clipboard-shortcuts-unavailable"),
    ).toContainText("Cmd/Ctrl+C, X, and V are unavailable");
    await this.page.keyboard.press("Escape");
    await expect(help).not.toBeAttached();
    await expect(
      this.textCardContaining("Shortcut guard").first(),
    ).toBeFocused();

    await this.page.keyboard.press("Enter");
    const editor = this.page.getByTestId("canvas-text-editor");
    await expect(editor).toBeFocused();
    await editor.press(await this.primaryShortcut("a"));
    await editor.press("Delete");
    await editor.type("?0f");
    await expect(editor).toHaveValue("?0f");
    await expect(
      this.page.getByTestId("canvas-shortcut-help"),
    ).not.toBeAttached();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(1);
    await expect(this.page.getByTestId("canvas-flow")).toHaveAttribute(
      "data-canvas-zoom",
      "1",
    );
    this.shortcutEditingGuardCompleted = true;
  }

  expectKeyboardViewportCommandsCompleted() {
    expect(this.keyboardViewportCommandsCompleted).toBe(true);
  }

  expectShortcutEditingGuardCompleted() {
    expect(this.shortcutEditingGuardCompleted).toBe(true);
  }

  async expectFocusedCanvasCard(text: string) {
    const card = this.textCardContaining(text).first();
    await expect(card).toHaveAttribute("data-focused", "true");
    await expect(card).toHaveAttribute("aria-selected", "true");
    await expect(card).toBeFocused();
    await expect(
      this.page.getByTestId("canvas-navigation-announcement"),
    ).toHaveText(`Text card, ${text}`);
  }

  async traverseCanvasSequentially(direction: "forward" | "backward") {
    const expected = [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ];
    const ordered =
      direction === "forward" ? expected : [...expected].reverse();
    const key = direction === "forward" ? "Tab" : "Shift+Tab";
    await this.focusCanvasCard(ordered[0]);
    this.sequentialTraversal[direction] = [await this.focusedCardName()];

    for (let index = 1; index < ordered.length; index += 1) {
      await this.page.keyboard.press(key);
      this.sequentialTraversal[direction].push(await this.focusedCardName());
    }

    await this.page.keyboard.press(key);
    this.exitedCanvasAtBoundary[direction] = await this.page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(
        active &&
        !active.closest("[data-item-id]") &&
        !active.matches('[data-testid="canvas-flow"]'),
      );
    });
  }

  async expectSequentialTraversal(direction: "forward" | "backward") {
    const expected = [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ];
    expect(this.sequentialTraversal[direction]).toEqual(
      direction === "forward" ? expected : [...expected].reverse(),
    );
    expect(this.exitedCanvasAtBoundary[direction]).toBe(true);
  }

  async createOffscreenNavigationLayout() {
    await this.addTextCard("Visible card");
    await this.addTextCard("Offscreen card");
    await this.moveCardBy("Offscreen card", 1400, 0);
    await this.focusCanvasCard("Visible card");
    this.zoomBeforeOffscreenNavigation = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-zoom");
  }

  async expectOffscreenCardRevealedWithoutZoomChange() {
    const canvas = this.page.getByTestId("canvas-flow");
    const card = this.textCardContaining("Offscreen card").first();
    await expect
      .poll(async () => {
        const [canvasBox, cardBox] = await Promise.all([
          canvas.boundingBox(),
          card.boundingBox(),
        ]);
        if (!canvasBox || !cardBox) return false;
        return (
          cardBox.x >= canvasBox.x + 24 &&
          cardBox.y >= canvasBox.y + 24 &&
          cardBox.x + cardBox.width <= canvasBox.x + canvasBox.width - 24 &&
          cardBox.y + cardBox.height <= canvasBox.y + canvasBox.height - 24
        );
      })
      .toBe(true);
    await expect(canvas).toHaveAttribute(
      "data-canvas-zoom",
      this.zoomBeforeOffscreenNavigation ?? "1",
    );
  }

  async enterFocusedCardEditing() {
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByTestId("canvas-text-editor")).toBeFocused();
  }

  async expectEditingKeysStayInCard(text: string) {
    const canvas = this.page.getByTestId("canvas-flow");
    const focusedItemId = await canvas.getAttribute("data-focused-item-id");
    const editor = this.page.getByTestId("canvas-text-editor");
    await editor.press("ArrowRight");
    await editor.press("Home");
    await expect(editor).toBeFocused();
    await expect(canvas).toHaveAttribute(
      "data-focused-item-id",
      focusedItemId ?? "",
    );
    await expect(this.textCardContaining(text).first()).toHaveAttribute(
      "data-editing",
      "true",
    );
  }

  async leaveCardEditing() {
    await this.page.getByTestId("canvas-text-editor").press("Escape");
  }

  async expectEmptyCanvas() {
    const canvas = this.page.getByTestId("canvas-flow");
    await expect(canvas).toBeVisible();
    await expect(
      canvas.getByText("Empty Canvas", { exact: true }),
    ).toBeVisible();
    this.lastDocumentId = await canvas.getAttribute("data-canvas-document-id");
    expect(this.lastDocumentId).toBeTruthy();
  }

  async expectSavedLocally() {
    const status = this.page.getByTestId("canvas-save-status");
    await expect(status).toHaveAttribute("data-save-state", "saved");
    await expect(status).toContainText("Local only");
    await expect(status).toContainText("Saved");
  }

  async expectDesktopOnlyNotice() {
    await expect(
      this.page.getByTestId("canvas-desktop-only-notice"),
    ).toContainText("Canvas editing is currently available on desktop");
    await expect(this.page.getByTestId("canvas-flow")).not.toBeAttached();
  }

  async expectRememberedCanvas() {
    await expect(
      this.page.locator('[data-testid="tab-Canvas 1"][aria-selected="true"]'),
    ).toBeVisible();
    await this.expectEmptyCanvas();
  }

  async rememberDocumentId() {
    this.lastDocumentId = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-document-id");
    expect(this.lastDocumentId).toBeTruthy();
  }

  async expectRememberedDocumentDeleted() {
    const documentId = this.lastDocumentId;
    expect(documentId).toBeTruthy();

    const exists = await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        const transaction = database.transaction("canvasDocuments", "readonly");
        const store = transaction.objectStore("canvasDocuments");
        return await new Promise<boolean>((resolve, reject) => {
          const request = store.get(id!);
          request.onsuccess = () => resolve(request.result !== undefined);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    }, documentId);

    expect(exists).toBe(false);
  }
}
