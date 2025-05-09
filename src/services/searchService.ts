import { Tab } from '../types';
import { SearchOptions, SearchResult } from '../stores/searchStore';

/**
 * Core search function. Iterates through tabs and their content.
 */
export function searchTabs(
    query: string,
    options: SearchOptions,
    tabsToSearch: Tab[]
): SearchResult[] {
    if (!query) {
        return [];
    }

    const results: SearchResult[] = [];
    const queryLower = options.caseSensitive ? query : query.toLowerCase();
    const queryRegex = options.wholeWord
        ? new RegExp(`\\b${escapeRegex(query)}\\b`, options.caseSensitive ? 'g' : 'gi')
        : null; // Create regex only if needed

    for (const tab of tabsToSearch) {
        if (tab.isTablet || !tab.content) { // Skip tablets and tabs without content
            continue;
        }

        const lines = tab.content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineToSearch = options.caseSensitive ? line : line.toLowerCase();

            if (queryRegex) {
                // Regex search (Whole Word)
                let match;
                while ((match = queryRegex.exec(lineToSearch)) !== null) {
                    results.push({
                        tabId: tab.id,
                        workspaceId: tab.workspaceId,
                        tabTitle: tab.title,
                        language: tab.language,
                        lineNumber: i + 1,
                        lineText: line,
                        matchIndex: match.index,
                        matchLength: match[0].length,
                        tabContent: tab.content
                    });
                    // Prevent infinite loops with zero-width matches
                    if (match.index === queryRegex.lastIndex) {
                       queryRegex.lastIndex++;
                    }
                }
            } else {
                // Simple substring search
                let startIndex = 0;
                let matchIndex: number;
                while ((matchIndex = lineToSearch.indexOf(queryLower, startIndex)) !== -1) {
                    results.push({
                        tabId: tab.id,
                        workspaceId: tab.workspaceId,
                        tabTitle: tab.title,
                        language: tab.language,
                        lineNumber: i + 1,
                        lineText: line,
                        matchIndex: matchIndex,
                        matchLength: queryLower.length,
                        tabContent: tab.content
                    });
                    startIndex = matchIndex + 1; // Move past the current match
                }
            }
        }
    }

    return results;
}

/** Helper to escape regex special characters in the query */
function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Helper to highlight matches in a text string. Returns an HTML string.
 */
export function highlightMatchesInText(
    text: string,
    query: string,
    options: SearchOptions
): string {
    if (!query || !text) {
        return escapeHtml(text); // Return escaped text if no query or text
    }

    const queryLower = options.caseSensitive ? query : query.toLowerCase();
    const textToSearch = options.caseSensitive ? text : text.toLowerCase();
    const queryRegex = options.wholeWord
        ? new RegExp(`\\b${escapeRegex(query)}\\b`, options.caseSensitive ? 'g' : 'gi')
        : null;

    let lastIndex = 0;
    let highlightedText = '';

    if (queryRegex) {
        let match;
        while ((match = queryRegex.exec(textToSearch)) !== null) {
            highlightedText += escapeHtml(text.substring(lastIndex, match.index));
            highlightedText += `<mark class="bg-yellow-500/40 text-yellow-100 px-0.5 rounded">${escapeHtml(text.substring(match.index, match.index + match[0].length))}</mark>`;
            lastIndex = match.index + match[0].length;
             if (match.index === queryRegex.lastIndex) { // Prevent infinite loop for zero-width matches
                queryRegex.lastIndex++;
            }
        }
    } else {
        let matchIndex;
        while ((matchIndex = textToSearch.indexOf(queryLower, lastIndex)) !== -1) {
            highlightedText += escapeHtml(text.substring(lastIndex, matchIndex));
            highlightedText += `<mark class="bg-yellow-500/40 text-yellow-100 px-0.5 rounded">${escapeHtml(text.substring(matchIndex, matchIndex + query.length))}</mark>`;
            lastIndex = matchIndex + query.length;
        }
    }

    highlightedText += escapeHtml(text.substring(lastIndex)); // Append remaining text

    return highlightedText;
}

/** Basic HTML escaping */
function escapeHtml(unsafe: string): string {
    if (!unsafe) return ''; // Handle null/undefined/empty input
    return unsafe
        .replace(/&/g, "&amp;")       // Escape ampersand first
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")      // Escape double quotes
        .replace(/'/g, "&#039;");     // Escape single quotes
}