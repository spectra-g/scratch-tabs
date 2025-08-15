/**
 * Utilities for migrating content between plain text and rich text formats
 */

/**
 * Converts plain text content to TipTap JSON format
 */
export const migrateTextToRich = (
  plainTextContent: string,
  dateCreated: number
): any => {
  if (!plainTextContent.trim()) {
    return {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated,
          },
        },
        {
          type: 'paragraph',
          content: [],
        },
      ],
    };
  }

  // Split content into paragraphs
  const paragraphs = plainTextContent.split('\n\n').filter(p => p.trim());
  
  const content = [
    {
      type: 'dateCreated',
      attrs: {
        dateCreated,
      },
    },
  ];

  // Convert each paragraph
  paragraphs.forEach(paragraph => {
    const lines = paragraph.split('\n');
    
    if (lines.length === 1) {
      // Single line paragraph
      content.push({
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: lines[0],
          },
        ],
      });
    } else {
      // Multi-line paragraph with line breaks
      const paragraphContent: any[] = [];
      
      lines.forEach((line, index) => {
        if (line.trim()) {
          paragraphContent.push({
            type: 'text',
            text: line,
          });
        }
        
        // Add hard break between lines (except for the last line)
        if (index < lines.length - 1) {
          paragraphContent.push({
            type: 'hardBreak',
          });
        }
      });
      
      content.push({
        type: 'paragraph',
        content: paragraphContent,
      });
    }
  });

  return {
    type: 'doc',
    content,
  };
};

/**
 * Converts TipTap JSON format back to plain text
 */
export const migrateRichToText = (richContent: any): string => {
  if (!richContent || !richContent.content) {
    return '';
  }

  const extractText = (node: any): string => {
    if (node.type === 'text') {
      return node.text || '';
    }
    
    if (node.type === 'hardBreak') {
      return '\n';
    }
    
    if (node.type === 'dateCreated') {
      return ''; // Skip date created node when converting back to text
    }
    
    if (node.content) {
      return node.content.map(extractText).join('');
    }
    
    return '';
  };

  const paragraphs: string[] = [];
  
  richContent.content.forEach((node: any) => {
    if (node.type === 'paragraph' && node.content) {
      const paragraphText = node.content.map(extractText).join('');
      if (paragraphText.trim()) {
        paragraphs.push(paragraphText);
      }
    } else if (node.type === 'heading' && node.content) {
      const headingText = node.content.map(extractText).join('');
      if (headingText.trim()) {
        // Add markdown-style heading markers
        const level = node.attrs?.level || 1;
        const markers = '#'.repeat(level);
        paragraphs.push(`${markers} ${headingText}`);
      }
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      // Handle lists
      const listItems = extractListItems(node);
      paragraphs.push(...listItems);
    } else if (node.type === 'codeBlock') {
      const codeText = extractText(node);
      if (codeText.trim()) {
        paragraphs.push(`\`\`\`\n${codeText}\n\`\`\``);
      }
    }
  });

  return paragraphs.join('\n\n');
};

/**
 * Helper function to extract list items
 */
const extractListItems = (listNode: any, isOrdered = false, indent = 0): string[] => {
  const items: string[] = [];
  const prefix = isOrdered ? '1. ' : '- ';
  const indentStr = '  '.repeat(indent);
  
  if (listNode.content) {
    listNode.content.forEach((item: any) => {
      if (item.type === 'listItem' && item.content) {
        const itemText = item.content.map((node: any) => {
          if (node.type === 'paragraph') {
            return node.content?.map((textNode: any) => textNode.text || '').join('') || '';
          }
          return '';
        }).join('');
        
        if (itemText.trim()) {
          items.push(`${indentStr}${prefix}${itemText}`);
        }
      }
    });
  }
  
  return items;
};

/**
 * Creates a code block node for importing content from other tabs
 */
export const createCodeBlockNode = (content: string, language: string = 'plaintext') => {
  return {
    type: 'codeBlock',
    attrs: {
      language,
    },
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
};