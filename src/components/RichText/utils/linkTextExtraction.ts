import { Editor } from '@tiptap/react';

/**
 * Interface for link text extraction result
 */
export interface LinkTextExtractionResult {
  text: string;
  success: boolean;
  method: 'html-single' | 'html-multiple' | 'selection-fallback';
}

/**
 * Extracts all links with a specific href from HTML content
 */
function extractLinksFromHTML(html: string, href: string): HTMLAnchorElement[] {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return Array.from(tempDiv.querySelectorAll(`a[href="${href}"]`));
}

/**
 * Finds the position with a link mark closest to the cursor position
 */
function findClosestLinkMarkPosition(
  editor: Editor,
  cursorPos: number,
  linkHref: string,
  searchRadius: number = 50
): number | null {
  const { doc } = editor.state;
  const searchStart = Math.max(0, cursorPos - searchRadius);
  const searchEnd = Math.min(doc.content.size, cursorPos + searchRadius);
  
  let activeLinkPos = -1;
  let minDistanceToLink = Infinity;
  
  for (let pos = searchStart; pos <= searchEnd; pos++) {
    try {
      const $pos = doc.resolve(pos);
      const marks = $pos.marks();
      const hasMatchingLink = marks && marks.some(mark => 
        mark.type.name === 'link' && mark.attrs.href === linkHref
      );
      
      if (hasMatchingLink) {
        const distanceToCursor = Math.abs(pos - cursorPos);
        if (distanceToCursor < minDistanceToLink) {
          minDistanceToLink = distanceToCursor;
          activeLinkPos = pos;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return activeLinkPos >= 0 ? activeLinkPos : null;
}

/**
 * Matches an active link position to the correct link text from HTML
 */
function matchPositionToLinkText(
  editor: Editor,
  activeLinkPos: number,
  linkCandidates: HTMLAnchorElement[],
  searchRadius: number = 50
): string | null {
  const { doc } = editor.state;
  const searchStart = Math.max(0, activeLinkPos - searchRadius);
  const searchEnd = Math.min(doc.content.size, activeLinkPos + searchRadius);
  const searchText = doc.textBetween(searchStart, searchEnd);
  
  for (const link of linkCandidates) {
    const linkText = link.textContent || '';
    const linkIndex = searchText.indexOf(linkText);
    
    if (linkIndex >= 0) {
      const linkStart = searchStart + linkIndex;
      const linkEnd = linkStart + linkText.length;
      
      if (activeLinkPos >= linkStart && activeLinkPos <= linkEnd) {
        return linkText;
      }
    }
  }
  
  return null;
}

/**
 * Finds the closest link by distance when position matching fails
 */
function findClosestLinkByDistance(
  editor: Editor,
  cursorPos: number,
  linkCandidates: HTMLAnchorElement[],
  searchRadius: number = 50
): string | null {
  const { doc } = editor.state;
  const searchStart = Math.max(0, cursorPos - searchRadius);
  const searchEnd = Math.min(doc.content.size, cursorPos + searchRadius);
  const searchText = doc.textBetween(searchStart, searchEnd);
  
  let bestMatch = null;
  let bestDistance = Infinity;
  
  for (const link of linkCandidates) {
    const linkText = link.textContent || '';
    const linkIndex = searchText.indexOf(linkText);
    
    if (linkIndex >= 0) {
      const linkStart = searchStart + linkIndex;
      const linkEnd = linkStart + linkText.length;
      const distanceToStart = Math.abs(cursorPos - linkStart);
      const distanceToEnd = Math.abs(cursorPos - linkEnd);
      const minDistance = Math.min(distanceToStart, distanceToEnd);
      
      if (minDistance < bestDistance) {
        bestDistance = minDistance;
        bestMatch = linkText;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Extracts the correct link text for editing, handling single and multiple links
 * @param editor - TipTap editor instance
 * @param linkHref - The href of the link to extract text for
 * @returns LinkTextExtractionResult containing the extracted text and metadata
 */
export function extractLinkTextForEditing(
  editor: Editor,
  linkHref: string
): LinkTextExtractionResult {
  try {
    // Get all links with this href from HTML
    const html = editor.getHTML();
    const links = extractLinksFromHTML(html, linkHref);
    
    if (links.length === 0) {
      // No links found - fallback to selection
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      return {
        text,
        success: false,
        method: 'selection-fallback'
      };
    }
    
    if (links.length === 1) {
      // Single link - use it directly
      const text = links[0].textContent || '';
      return {
        text,
        success: true,
        method: 'html-single'
      };
    }
    
    // Multiple links - find the one closest to cursor
    const cursorPos = editor.state.selection.from;
    
    // Try to find the active link position and match it to text
    const activeLinkPos = findClosestLinkMarkPosition(editor, cursorPos, linkHref);
    
    if (activeLinkPos !== null) {
      const matchedText = matchPositionToLinkText(editor, activeLinkPos, links);
      if (matchedText) {
        return {
          text: matchedText,
          success: true,
          method: 'html-multiple'
        };
      }
    }
    
    // Fallback to closest link by distance
    const closestText = findClosestLinkByDistance(editor, cursorPos, links);
    
    if (closestText) {
      return {
        text: closestText,
        success: true,
        method: 'html-multiple'
      };
    }
    
    // Final fallback to selection
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    return {
      text,
      success: false,
      method: 'selection-fallback'
    };
    
  } catch (error) {
    console.error('Error in link text extraction:', error);
    // Error fallback to current selection
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    return {
      text,
      success: false,
      method: 'selection-fallback'
    };
  }
}