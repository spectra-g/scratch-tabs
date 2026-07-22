import { expect, Page } from "@playwright/test";

const CANVAS_FEATURE_SETTING_KEY = "features.canvas.enabled";

export class CanvasActions {
  private lastDocumentId: string | null = null;
  private pendingSaveRevision = 0;
  private rememberedBounds: Record<"x" | "y" | "width" | "height", number> | null = null;

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

  async expectNoCards() {
    await expect(this.page.locator("[data-item-id]")).toHaveCount(0);
  }

  async expectEmptyCanvas() {
    const canvas = this.page.getByTestId("canvas-flow");
    await expect(canvas).toBeVisible();
    await expect(canvas.getByText("Empty Canvas", { exact: true })).toBeVisible();
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
      this.page.locator(
        '[data-testid="tab-Canvas 1"][aria-selected="true"]',
      ),
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
