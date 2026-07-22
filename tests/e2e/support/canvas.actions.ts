import { expect, Page } from "@playwright/test";

const CANVAS_FEATURE_SETTING_KEY = "features.canvas.enabled";

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

  constructor(private page: Page) {}

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
