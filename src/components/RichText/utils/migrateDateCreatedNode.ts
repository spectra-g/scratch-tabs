/**
 * Migration utility to remove dateCreated nodes from existing rich text content
 *
 * Background: DateCreated was originally implemented as a TipTap node embedded in the document.
 * This caused complexity with cursor positioning, event handling, and accidental deletion.
 * We've now moved it to an external React component, but need to handle existing documents
 * that may still have the dateCreated node in their content.
 */

export interface RichContent {
  type: string;
  content?: RichContent[];
  attrs?: Record<string, any>;
  [key: string]: any;
}

/**
 * Recursively removes all dateCreated nodes from rich text content
 *
 * @param content - The TipTap JSON document content
 * @returns Cleaned content with dateCreated nodes removed
 */
export function migrateDateCreatedNode(content: RichContent | undefined | null): RichContent | undefined {
  if (!content) {
    return undefined;
  }

  // If this is a dateCreated node, filter it out
  if (content.type === 'dateCreated') {
    return undefined;
  }

  // If this node has children, recursively clean them
  if (content.content && Array.isArray(content.content)) {
    const cleanedChildren = content.content
      .map(child => migrateDateCreatedNode(child))
      .filter((child): child is RichContent => child !== undefined);

    return {
      ...content,
      content: cleanedChildren,
    };
  }

  return content;
}

/**
 * Checks if content contains any dateCreated nodes
 *
 * @param content - The TipTap JSON document content
 * @returns true if dateCreated nodes are found
 */
export function hasDateCreatedNode(content: RichContent | undefined | null): boolean {
  if (!content) {
    return false;
  }

  if (content.type === 'dateCreated') {
    return true;
  }

  if (content.content && Array.isArray(content.content)) {
    return content.content.some(child => hasDateCreatedNode(child));
  }

  return false;
}

/**
 * Automatically migrates richContent if it contains dateCreated nodes
 * This is the main function that should be used when loading documents
 *
 * @param richContent - The TipTap JSON document
 * @returns Migrated content with dateCreated nodes removed (or original if no migration needed)
 */
export function autoMigrateDateCreatedNode(richContent: any): any {
  if (!richContent || !hasDateCreatedNode(richContent)) {
    return richContent;
  }

  console.log('[Migration] Found legacy dateCreated node, removing...');
  const migrated = migrateDateCreatedNode(richContent);
  console.log('[Migration] DateCreated node removed successfully');

  return migrated;
}
