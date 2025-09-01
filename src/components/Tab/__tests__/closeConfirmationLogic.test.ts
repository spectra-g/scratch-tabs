/**
 * Test the close confirmation logic for tabs with content or richContent
 */
import { Tab } from '../../../types';
import { RichTextService } from '../../RichText/services/RichTextService';

// Extract the logic into a testable function
const shouldShowCloseConfirmation = (tab: Tab, shouldBypassConfirmation: boolean): boolean => {
  if (shouldBypassConfirmation) return false;
  
  const hasTextContent = tab.content && tab.content.trim() !== "";
  const hasRichContent = RichTextService.hasContent(tab.richContent);
  const hasAnyContent = hasTextContent || hasRichContent;
  
  return hasAnyContent || tab.isTablet;
};

const createMockTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: 'test-tab',
  title: 'Test Tab',
  content: '',
  richContent: null,
  language: 'plaintext',
  languageLocked: false,
  isRich: false,
  workspaceId: 'default',
  dateCreated: Date.now(),
  lastModified: Date.now(),
  cursorPosition: { lineNumber: 1, column: 1 },
  isPinned: false,
  isTablet: false,
  tabletState: '',
  previewMode: false,
  ...overrides,
});

describe('Close Confirmation Logic', () => {
  test('should show confirmation for tab with text content', () => {
    const tabWithContent = createMockTab({ content: 'Some text content' });
    expect(shouldShowCloseConfirmation(tabWithContent, false)).toBe(true);
  });

  test('should show confirmation for tab with rich content', () => {
    const tabWithRichContent = createMockTab({ 
      richContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich text' }] }] },
      isRich: true 
    });
    expect(shouldShowCloseConfirmation(tabWithRichContent, false)).toBe(true);
  });

  test('should show confirmation for tab with both content types', () => {
    const tabWithBothContent = createMockTab({ 
      content: 'Text content',
      richContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich text' }] }] },
      isRich: true 
    });
    expect(shouldShowCloseConfirmation(tabWithBothContent, false)).toBe(true);
  });

  test('should not show confirmation for empty tab', () => {
    const emptyTab = createMockTab({ content: '', richContent: null });
    expect(shouldShowCloseConfirmation(emptyTab, false)).toBe(false);
  });

  test('should not show confirmation for tab with only whitespace content', () => {
    const whitespaceTab = createMockTab({ content: '   \n  \t  ' });
    expect(shouldShowCloseConfirmation(whitespaceTab, false)).toBe(false);
  });

  test('should show confirmation for tablet tabs even without content', () => {
    const tabletTab = createMockTab({ isTablet: true, content: '' });
    expect(shouldShowCloseConfirmation(tabletTab, false)).toBe(true);
  });

  test('should bypass confirmation when shouldBypassConfirmation is true', () => {
    const tabWithContent = createMockTab({ content: 'Some content' });
    expect(shouldShowCloseConfirmation(tabWithContent, true)).toBe(false);
  });

  test('should handle empty rich content object', () => {
    const tabWithEmptyRichContent = createMockTab({ 
      richContent: { type: 'doc', content: [] },
      isRich: true 
    });
    expect(shouldShowCloseConfirmation(tabWithEmptyRichContent, false)).toBe(false);
  });

  test('should handle null rich content', () => {
    const tabWithNullRichContent = createMockTab({ 
      richContent: null,
      isRich: true 
    });
    expect(shouldShowCloseConfirmation(tabWithNullRichContent, false)).toBe(false);
  });
});