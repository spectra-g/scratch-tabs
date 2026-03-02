import { test, expect } from "@playwright/test";
import { ClipboardActions } from "./support/clipboard.actions";
import { EditorActions } from "./support/editor.actions";

const APP_URL = "http://localhost:5173/";

test.describe("Monaco context-menu copy/paste", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(APP_URL);
    await page.waitForLoadState("domcontentloaded");

    const editorContainer = page.locator(
      '[data-editor-pane-side="left"] [data-testid="monaco-editor-container"] .monaco-editor',
    );
    if (!(await editorContainer.isVisible())) {
      await page.locator('[data-testid="icon-new-tab"]').click();
    }

    await expect(editorContainer).toBeVisible();
    await page.waitForFunction(() => {
      return !!(window as any).monaco?.editor?.getEditors?.().length;
    });
  });

  test("AC-001: copies selected text via context menu into clipboard", async ({
    page,
  }) => {
    const clipboard = new ClipboardActions(page);
    const editor = new EditorActions(page);

    await editor.setMonacoContent("alpha beta gamma");
    await editor.setMonacoSelection(1, 1, 1, 6);
    await editor.openMonacoContextMenu();
    await editor.clickMonacoContextMenuItem("Copy");

    await expect.poll(() => clipboard.getClipboardContent()).toBe("alpha");
  });

  test("AC-002: pastes clipboard text at cursor position via context menu", async ({
    page,
  }) => {
    const clipboard = new ClipboardActions(page);
    const editor = new EditorActions(page);

    await editor.setMonacoContent("hello world");
    await clipboard.setClipboardContent(" brave");
    await editor.setMonacoCursor(1, 6);
    await editor.openMonacoContextMenu();
    await editor.clickMonacoContextMenuItem("Paste");

    await expect.poll(() => editor.getMonacoEditorContent()).toBe(
      "hello brave world",
    );
  });

  test("AC-003: paste replaces selected text via context menu", async ({
    page,
  }) => {
    const clipboard = new ClipboardActions(page);
    const editor = new EditorActions(page);

    await editor.setMonacoContent("color=blue");
    await clipboard.setClipboardContent("green");
    await editor.setMonacoSelection(1, 7, 1, 11);
    await editor.openMonacoContextMenu();
    await editor.clickMonacoContextMenuItem("Paste");

    await expect.poll(() => editor.getMonacoEditorContent()).toBe("color=green");
  });

  test("AC-004: clipboard permissions are pre-granted for the harness", async ({
    page,
  }) => {
    const clipboard = new ClipboardActions(page);

    await clipboard.setClipboardContent("perm-ok");
    await expect.poll(() => clipboard.getClipboardContent()).toBe("perm-ok");
  });

  test("AC-005: helper methods reliably drive Monaco context-menu interactions", async ({
    page,
  }) => {
    const clipboard = new ClipboardActions(page);
    const editor = new EditorActions(page);

    expect(typeof editor.setMonacoContent).toBe("function");
    expect(typeof editor.setMonacoSelection).toBe("function");
    expect(typeof editor.setMonacoCursor).toBe("function");
    expect(typeof editor.openMonacoContextMenu).toBe("function");
    expect(typeof editor.clickMonacoContextMenuItem).toBe("function");

    await editor.setMonacoContent("helper-check");
    await editor.setMonacoSelection(1, 1, 1, 7);
    await editor.openMonacoContextMenu();
    await editor.clickMonacoContextMenuItem("Copy");
    await expect.poll(() => clipboard.getClipboardContent()).toBe("helper");
  });
});
