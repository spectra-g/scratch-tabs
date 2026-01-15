import { Tab } from "../types";
import { formatRegistry } from "../formats";

/**
 * Downloads a tab's content as a file.
 * 
 * @param tab - The tab to download
 * @returns void
 * 
 * @example
 * ```typescript
 * const tab = tabsStore.tabs.find(t => t.id === 'some-id');
 * if (tab) {
 *   downloadTab(tab);
 * }
 * ```
 */
export function downloadTab(tab: Tab): void {
    // Don't download tablets or invalid tabs
    if (!tab || tab.isTablet) {
        return;
    }

    // Determine file extension based on language
    const detector = formatRegistry.getById(tab.language);
    const extension = detector?.getFileExtension() || "txt";

    // Create blob and download link
    const blob = new Blob([tab.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab.title}.${extension}`;

    // Trigger download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
}
