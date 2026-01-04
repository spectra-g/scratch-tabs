import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor";
import { SmartViewSyncConfig } from "../views/registry";

interface UseSmartViewSyncProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  previewContainer: HTMLDivElement | null;
  syncConfig: SmartViewSyncConfig | undefined;
  content: string;
  enabled: boolean;
}

/**
 * Custom hook to handle bidirectional scroll and click synchronization
 * between Monaco editor and preview pane for smart views
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

    // Scroll sync: Editor -> Preview
    let editorScrollDisposable: Monaco.IDisposable | null = null;
    if (syncConfig.enableScrollSync) {
      editorScrollDisposable = editor.onDidScrollChange(() => {
        if (syncInProgressRef.current) return;

        syncInProgressRef.current = true;

        // Get visible range to determine what content is actually shown
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
          const firstVisibleLine = visibleRanges[0].startLineNumber;
          const model = editor.getModel();
          const totalLines = model ? model.getLineCount() : 1;

          // Calculate percentage based on which line is at the top (accounting for scrollBeyondLastLine)
          // This maps the editor's extended scroll range to the preview's normal scroll range
          const contentPercentage = totalLines > 1 ? (firstVisibleLine - 1) / (totalLines - 1) : 0;

          // Apply to preview
          const previewMaxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
          const targetScrollTop = contentPercentage * previewMaxScroll;
          previewContainer.scrollTop = targetScrollTop;
        }

        setTimeout(() => {
          syncInProgressRef.current = false;
        }, 50);
      });
    }

    // Scroll sync: Preview -> Editor
    const handlePreviewScroll = () => {
      if (syncInProgressRef.current || !syncConfig.enableScrollSync) return;

      syncInProgressRef.current = true;

      // Calculate scroll percentage in preview
      const scrollTop = previewContainer.scrollTop;
      const maxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
      const contentPercentage = maxScroll > 0 ? scrollTop / maxScroll : 0;

      // Map to editor line (accounting for scrollBeyondLastLine)
      const model = editor.getModel();
      const totalLines = model ? model.getLineCount() : 1;

      // Calculate which line should be at the top of the viewport
      const targetLine = Math.round(contentPercentage * (totalLines - 1)) + 1;

      // Scroll editor to show this line at the top
      editor.revealLineInCenter(targetLine, 0); // 0 = immediate scroll type

      // For more precise control, use setScrollPosition
      // This ensures the line is at the top, not center
      const lineTop = editor.getTopForLineNumber(targetLine);
      editor.setScrollTop(lineTop);

      setTimeout(() => {
        syncInProgressRef.current = false;
      }, 50);
    };

    if (syncConfig.enableScrollSync) {
      previewContainer.addEventListener('scroll', handlePreviewScroll);
    }

    // Click sync: Preview -> Editor
    const handlePreviewClick = (e: MouseEvent) => {
      if (!syncConfig.enableClickSync || !syncConfig.getLineFromElement) return;

      const target = e.target as HTMLElement;
      const lineNum = syncConfig.getLineFromElement(target, content);

      if (lineNum !== null) {
        // Scroll editor to this line
        editor.revealLineInCenter(lineNum);
        editor.setPosition({ lineNumber: lineNum, column: 1 });
        editor.focus();
      }
    };

    if (syncConfig.enableClickSync) {
      previewContainer.addEventListener('click', handlePreviewClick);
    }

    // Cleanup
    return () => {
      editorScrollDisposable?.dispose();
      if (syncConfig.enableScrollSync) {
        previewContainer.removeEventListener('scroll', handlePreviewScroll);
      }
      if (syncConfig.enableClickSync) {
        previewContainer.removeEventListener('click', handlePreviewClick);
      }
    };
  }, [editor, previewContainer, syncConfig, content, enabled]);
}
