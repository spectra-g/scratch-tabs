import { Tab } from "../types";
import { SearchOptions, SearchResult } from "../stores/searchStore";
import {
  tabDocumentAdapterResolver,
  type TabDocumentAdapterResolver,
  type TabDocumentSearchData,
  type TabDocumentSearchEntry,
} from "./tabDocumentAdapter";

/**
 * Core search function. Iterates through tabs and their content.
 */
export function searchTabs(
  query: string,
  options: SearchOptions,
  tabsToSearch: Tab[],
): SearchResult[] {
  return searchLoadedTabDocuments(
    query,
    options,
    tabsToSearch.map((tab) => ({
      tab,
      searchData:
        tab.isTablet || !tab.content
          ? { searchText: "", entries: [] }
          : {
              searchText: tab.content,
              entries: [{ text: tab.content, language: tab.language }],
            },
    })),
  );
}

interface LoadedTabSearchData {
  tab: Tab;
  searchData: TabDocumentSearchData;
}

export async function searchTabDocuments(
  query: string,
  options: SearchOptions,
  tabsToSearch: Tab[],
  resolver: TabDocumentAdapterResolver = tabDocumentAdapterResolver,
): Promise<SearchResult[]> {
  if (!query) return [];
  const loaded = await Promise.all(
    tabsToSearch.map(async (tab) => {
      const adapter = await resolver.resolve(tab);
      return { tab, searchData: await adapter.getSearchData(tab) };
    }),
  );
  return searchLoadedTabDocuments(query, options, loaded);
}

const searchLoadedTabDocuments = (
  query: string,
  options: SearchOptions,
  loadedTabs: LoadedTabSearchData[],
): SearchResult[] => {
  if (!query) return [];
  const results: SearchResult[] = [];
  const queryLower = options.caseSensitive ? query : query.toLowerCase();
  const queryRegex = options.wholeWord
    ? new RegExp(
        `\\b${escapeRegex(query)}\\b`,
        options.caseSensitive ? "g" : "gi",
      )
    : null; // Create regex only if needed

  for (const { tab, searchData } of loadedTabs) {
    if (!searchData.searchText || !searchData.entries.length) continue;
    if (!containsQuery(searchData.searchText, query, options)) continue;
    for (const entry of searchData.entries) {
      appendEntryResults({
        entry,
        tab,
        query,
        queryLower,
        queryRegex,
        options,
        results,
      });
    }
  }
  return results;
};

const appendEntryResults = ({
  entry,
  tab,
  queryLower,
  queryRegex,
  options,
  results,
}: {
  entry: TabDocumentSearchEntry;
  tab: Tab;
  query: string;
  queryLower: string;
  queryRegex: RegExp | null;
  options: SearchOptions;
  results: SearchResult[];
}): void => {
    const lines = entry.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineToSearch = options.caseSensitive ? line : line.toLowerCase();

      if (queryRegex) {
        queryRegex.lastIndex = 0;
        let match;
        while ((match = queryRegex.exec(lineToSearch)) !== null) {
          results.push(toSearchResult(tab, entry, line, i, match.index, match[0].length));
          if (match.index === queryRegex.lastIndex) {
            queryRegex.lastIndex++;
          }
        }
      } else {
        // Simple substring search
        let startIndex = 0;
        let matchIndex: number;
        while (
          (matchIndex = lineToSearch.indexOf(queryLower, startIndex)) !== -1
        ) {
          results.push(
            toSearchResult(
              tab,
              entry,
              line,
              i,
              matchIndex,
              queryLower.length,
            ),
          );
          startIndex = matchIndex + 1;
        }
      }
    }
};

const toSearchResult = (
  tab: Tab,
  entry: TabDocumentSearchEntry,
  lineText: string,
  lineIndex: number,
  matchIndex: number,
  matchLength: number,
): SearchResult => ({
  tabId: tab.id,
  workspaceId: tab.workspaceId,
  tabTitle: tab.title,
  language: entry.language,
  lineNumber: lineIndex + 1,
  lineText,
  matchIndex,
  matchLength,
  tabContent: entry.text,
  resultKind: entry.itemId ? "canvas-item" : "tab",
  ...(entry.itemId ? { canvasItemId: entry.itemId } : {}),
  ...(entry.itemType ? { canvasItemType: entry.itemType } : {}),
  ...(entry.itemLabel ? { itemLabel: entry.itemLabel } : {}),
});

const containsQuery = (
  text: string,
  query: string,
  options: SearchOptions,
): boolean => {
  if (options.wholeWord) {
    return new RegExp(
      `\\b${escapeRegex(query)}\\b`,
      options.caseSensitive ? "" : "i",
    ).test(text);
  }
  const searchable = options.caseSensitive ? text : text.toLowerCase();
  const needle = options.caseSensitive ? query : query.toLowerCase();
  return searchable.includes(needle);
};

/** Helper to escape regex special characters in the query */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Helper to highlight matches in a text string. Returns an HTML string.
 */
export function highlightMatchesInText(
  text: string,
  query: string,
  options: SearchOptions,
): string {
  if (!query || !text) {
    return escapeHtml(text); // Return escaped text if no query or text
  }

  const queryLower = options.caseSensitive ? query : query.toLowerCase();
  const textToSearch = options.caseSensitive ? text : text.toLowerCase();
  const queryRegex = options.wholeWord
    ? new RegExp(
        `\\b${escapeRegex(query)}\\b`,
        options.caseSensitive ? "g" : "gi",
      )
    : null;

  let lastIndex = 0;
  let highlightedText = "";

  if (queryRegex) {
    let match;
    while ((match = queryRegex.exec(textToSearch)) !== null) {
      highlightedText += escapeHtml(text.substring(lastIndex, match.index));
      highlightedText += `<mark class="bg-yellow-500/40 text-yellow-100 px-0.5 rounded">${escapeHtml(text.substring(match.index, match.index + match[0].length))}</mark>`;
      lastIndex = match.index + match[0].length;
      if (match.index === queryRegex.lastIndex) {
        // Prevent infinite loop for zero-width matches
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
  if (!unsafe) return ""; // Handle null/undefined/empty input
  return unsafe
    .replace(/&/g, "&amp;") // Escape ampersand first
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;") // Escape double quotes
    .replace(/'/g, "&#039;"); // Escape single quotes
}
