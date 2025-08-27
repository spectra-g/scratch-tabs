import { Tab } from '../../../types';
import { useTabsStore } from '../../../stores/tabsStore';
import { createCodeBlockNode } from '../utils/contentMigration';

/**
 * Service for managing rich text operations and integrations
 */
export class RichTextService {
  /**
   * Import content from another tab as a code block
   */
  static async importContentAsCodeBlock(
    sourceTabId: string,
    editor: any
  ): Promise<void> {
    const { tabs } = useTabsStore.getState();
    const sourceTab = tabs.find(tab => tab.id === sourceTabId);
    
    if (!sourceTab || sourceTab.isTablet) {
      throw new Error('Source tab not found or is a tablet');
    }

    const content = sourceTab.content || '';
    const language = sourceTab.language || 'plaintext';
    
    // Create a code block node
    const codeBlockNode = createCodeBlockNode(content, language);
    
    // Insert the code block at the current cursor position
    if (editor) {
      editor.chain().focus().insertContent(codeBlockNode).run();
    }
  }

  /**
   * Get available tabs for import (excluding tablets and the current tab)
   */
  static getImportableTabs(currentTabId: string): Tab[] {
    const { tabs } = useTabsStore.getState();
    return tabs.filter(tab => 
      tab.id !== currentTabId && 
      !tab.isTablet && 
      (tab.content?.trim().length || 0) > 0
    );
  }

  /**
   * Convert a tab from plain text to rich text mode
   */
  static upgradeTabToRichText(tabId: string): void {
    const { updateTabState } = useTabsStore.getState();
    const { tabs } = useTabsStore.getState();
    const tab = tabs.find(t => t.id === tabId);
    
    if (!tab || tab.isRich) return;

    // Import migration utility
    import('../utils/contentMigration').then(({ migrateTextToRich }) => {
      const richContent = migrateTextToRich(
        tab.content || '',
        tab.dateCreated
      );

      updateTabState(tabId, {
        isRich: true,
        richContent,
        lastModified: Date.now(),
      });
    });
  }

  /**
   * Convert a tab from rich text to plain text mode
   */
  static downgradeTabToPlainText(tabId: string): void {
    const { updateTabState } = useTabsStore.getState();
    const { tabs } = useTabsStore.getState();
    const tab = tabs.find(t => t.id === tabId);
    
    if (!tab || !tab.isRich) return;

    // Import migration utility
    import('../utils/contentMigration').then(({ migrateRichToText }) => {
      const plainTextContent = migrateRichToText(tab.richContent);

      updateTabState(tabId, {
        isRich: false,
        content: plainTextContent,
        richContent: null,
        lastModified: Date.now(),
      });
    });
  }

  // Note: setBackgroundTexture method removed - background texture is now managed
  // directly within richContent.attrs by the toolbar component

  /**
   * Check if a tab can be upgraded to rich text
   */
  static canUpgradeToRichText(tab: Tab): boolean {
    return !tab.isTablet && !tab.isRich;
  }

  /**
   * Check if a tab can be downgraded to plain text
   */
  static canDowngradeToPlainText(tab: Tab): boolean {
    return !tab.isTablet && tab.isRich;
  }
}