import * as React from "react";

/**
 * Highlights search terms in text by wrapping matches with <mark> elements
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns React elements with highlighted matches or plain text if no query
 */
export const highlightSearchTerm = (text: string, query: string): React.ReactNode => {
  if (!query || !text || !query.trim()) {
    return text;
  }
  
  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-400 text-black px-0.5 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
};