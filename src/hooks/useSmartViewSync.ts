import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor";
import { SmartViewSyncConfig } from "../views/registry";
import { collectAnchors, lineForTop, topForLine, type SyncAnchor } from "./scrollSync";

interface UseSmartViewSyncProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  previewContainer: HTMLDivElement | null;
  syncConfig: SmartViewSyncConfig | undefined;
  content: string;
  enabled: boolean;
}

/** How long a programmatic scroll is allowed to settle before the other pane may react. */
const SYNC_SETTLE_MS = 50;

/**
 * `monaco.editor.ScrollType.Immediate`, as a literal so this file can keep its
 * type-only Monaco import. Smooth scrolling animates for longer than the
 * re-entrancy guard above, so its trailing scroll events would escape the guard
 * and bounce back into the other pane.
 */
const SCROLL_IMMEDIATE = 1;

/**
 * Fractional line at the top of the editor viewport.
 *
 * The fraction matters: without it the preview only moves when the editor
 * crosses a whole line, which reads as a stutter rather than a scroll.
 * `getTopForLineNumber` is used rather than a fixed line height because it
 * accounts for wrapped lines, which are taller than one line.
 */
function editorTopLine(editor: Monaco.editor.IStandaloneCodeEditor): number {
  const visible = editor.getVisibleRanges();
  if (visible.length === 0) return 1;

  const line = visible[0].startLineNumber;
  const lineTop = editor.getTopForLineNumber(line);
  const nextTop = editor.getTopForLineNumber(line + 1);
  const height = nextTop - lineTop;
  if (height <= 0) return line;

  const progress = (editor.getScrollTop() - lineTop) / height;
  return line + Math.min(Math.max(progress, 0), 1);
}

/** Scrolls the editor so a fractional source line sits at the top of the viewport. */
function scrollEditorToLine(
  editor: Monaco.editor.IStandaloneCodeEditor,
  line: number,
): void {
  const model = editor.getModel();
  const lastLine = model ? model.getLineCount() : 1;
  const clamped = Math.min(Math.max(line, 1), lastLine);

  const whole = Math.floor(clamped);
  const lineTop = editor.getTopForLineNumber(whole);
  const nextTop = editor.getTopForLineNumber(Math.min(whole + 1, lastLine));

  editor.setScrollTop(lineTop + (clamped - whole) * (nextTop - lineTop));
}

/**
 * Bidirectional scroll and click synchronisation between the Monaco editor and
 * a side-by-side smart view.
 *
 * Scroll mapping is anchor-based wherever the view emits `data-source-line`
 * (see scrollSync.ts). Views that emit none fall back to proportional mapping,
 * which is the best that can be done without knowing where anything came from.
 */
export function useSmartViewSync({
  editor,
  previewContainer,
  syncConfig,
  content,
  enabled,
}: UseSmartViewSyncProps): void {
  const syncInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    if (!syncConfig || !enabled || !editor || !previewContainer) {
      return;
    }

    // The anchor table is rebuilt lazily and invalidated whenever the rendered
    // height changes - images finishing, fonts swapping, a smart view expanding
    // all move every offset below them.
    let anchors: SyncAnchor[] | null = null;
    let anchorsHeight = -1;

    const getAnchors = (): SyncAnchor[] => {
      if (anchors === null || previewContainer.scrollHeight !== anchorsHeight) {
        anchors = collectAnchors(previewContainer);
        anchorsHeight = previewContainer.scrollHeight;
      }
      return anchors;
    };

    const beginSync = () => {
      syncInProgressRef.current = true;
      setTimeout(() => {
        syncInProgressRef.current = false;
      }, SYNC_SETTLE_MS);
    };

    const previewMaxScroll = () =>
      previewContainer.scrollHeight - previewContainer.clientHeight;

    // Scroll sync: Editor -> Preview
    let editorScrollDisposable: Monaco.IDisposable | null = null;
    if (syncConfig.enableScrollSync) {
      editorScrollDisposable = editor.onDidScrollChange(() => {
        if (syncInProgressRef.current) return;

        const model = editor.getModel();
        if (!model) return;

        const line = editorTopLine(editor);
        const anchored = topForLine(getAnchors(), line);

        if (anchored !== null) {
          beginSync();
          previewContainer.scrollTop = anchored;
          return;
        }

        // No anchors: fall back to proportional mapping
        const totalLines = model.getLineCount();
        const ratio = totalLines > 1 ? (line - 1) / (totalLines - 1) : 0;

        beginSync();
        previewContainer.scrollTop = ratio * previewMaxScroll();
      });
    }

    // Scroll sync: Preview -> Editor
    const handlePreviewScroll = () => {
      if (syncInProgressRef.current || !syncConfig.enableScrollSync) return;

      const model = editor.getModel();
      if (!model) return;

      const anchoredLine = lineForTop(getAnchors(), previewContainer.scrollTop);

      if (anchoredLine !== null) {
        beginSync();
        scrollEditorToLine(editor, anchoredLine);
        return;
      }

      const maxScroll = previewMaxScroll();
      const ratio = maxScroll > 0 ? previewContainer.scrollTop / maxScroll : 0;

      beginSync();
      scrollEditorToLine(editor, ratio * (model.getLineCount() - 1) + 1);
    };

    if (syncConfig.enableScrollSync) {
      previewContainer.addEventListener("scroll", handlePreviewScroll);
    }

    // Click sync: Preview -> Editor
    const handlePreviewClick = (e: MouseEvent) => {
      if (!syncConfig.enableClickSync || !syncConfig.getLineFromElement) return;

      // Selecting text in the preview ends in a click. Jumping the editor and
      // stealing focus at that point tears the selection away mid-gesture, so a
      // click that completes a selection is not a navigation request.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      // Interactive controls own their click: links, the copy button, outline
      // entries and task-list checkboxes all have their own behaviour.
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, textarea, select")) return;

      const lineNum = syncConfig.getLineFromElement(target, content);
      if (lineNum === null) return;

      // Moving the editor fires its scroll listener. Without the guard the
      // preview would then be scrolled to match the editor's new position,
      // carrying the block that was just clicked out of view.
      beginSync();

      editor.setPosition({ lineNumber: lineNum, column: 1 });
      // Only scroll when the line is genuinely off screen. Clicking something
      // already visible is a request to put the caret there, not to re-centre
      // the viewport around it.
      editor.revealLineInCenterIfOutsideViewport(lineNum, SCROLL_IMMEDIATE);
      editor.focus();
    };

    if (syncConfig.enableClickSync) {
      previewContainer.addEventListener("click", handlePreviewClick);
    }

    // Cleanup
    return () => {
      editorScrollDisposable?.dispose();
      if (syncConfig.enableScrollSync) {
        previewContainer.removeEventListener("scroll", handlePreviewScroll);
      }
      if (syncConfig.enableClickSync) {
        previewContainer.removeEventListener("click", handlePreviewClick);
      }
    };
  }, [editor, previewContainer, syncConfig, content, enabled]);
}
