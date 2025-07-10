import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useSearchStore, SearchResult, SearchOptions } from "../searchStore";

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Replace localStorage with mock
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("SearchStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useSearchStore.setState({
      isOpen: false,
      query: "",
      results: [],
      selectedResultIndex: null,
      scope: "activeWorkspace",
      options: {
        caseSensitive: false,
        wholeWord: false,
      },
      titleFilter: "",
      languageFilter: [],
      searchHistory: [],
      isLoading: false,
      statusMessage: "Enter text to search.",
      error: null,
    });

    // Clear localStorage mock
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with correct default values", () => {
      const state = useSearchStore.getState();

      expect(state.isOpen).toBe(false);
      expect(state.query).toBe("");
      expect(state.results).toEqual([]);
      expect(state.selectedResultIndex).toBeNull();
      expect(state.scope).toBe("activeWorkspace");
      expect(state.options).toEqual({
        caseSensitive: false,
        wholeWord: false,
      });
      expect(state.titleFilter).toBe("");
      expect(state.languageFilter).toEqual([]);
      expect(state.searchHistory).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.statusMessage).toBe("Enter text to search.");
      expect(state.error).toBeNull();
    });
  });

  describe("Toggle Search", () => {
    it("should toggle search from closed to open", () => {
      expect(useSearchStore.getState().isOpen).toBe(false);

      useSearchStore.getState().toggleSearch();

      const state = useSearchStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.error).toBeNull();
      expect(state.statusMessage).toBe("Enter text to search.");
    });

    it("should toggle search from open to closed", () => {
      useSearchStore.setState({ isOpen: true });

      useSearchStore.getState().toggleSearch();

      const state = useSearchStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.statusMessage).toBe("Search closed.");
    });

    it("should open search with initial query", () => {
      const initialQuery = "test query";

      useSearchStore.getState().toggleSearch(initialQuery);

      const state = useSearchStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.query).toBe(initialQuery);
      expect(state.statusMessage).toBe("Searching...");
    });

    it("should preserve query when toggling without initial query", () => {
      const existingQuery = "existing query";
      useSearchStore.setState({ query: existingQuery });

      useSearchStore.getState().toggleSearch();

      expect(useSearchStore.getState().query).toBe(existingQuery);
    });

    it("should clear query when closing search", () => {
      useSearchStore.setState({ isOpen: true, query: "test" });

      useSearchStore.getState().toggleSearch();

      expect(useSearchStore.getState().query).toBe("");
    });
  });

  describe("Query Management", () => {
    it("should set query and reset selection", () => {
      useSearchStore.setState({ selectedResultIndex: 2 });

      useSearchStore.getState().setQuery("new query");

      const state = useSearchStore.getState();
      expect(state.query).toBe("new query");
      expect(state.selectedResultIndex).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("Scope Management", () => {
    it("should set scope and reset selection", () => {
      useSearchStore.setState({ selectedResultIndex: 1 });

      useSearchStore.getState().setScope("allWorkspaces");

      const state = useSearchStore.getState();
      expect(state.scope).toBe("allWorkspaces");
      expect(state.selectedResultIndex).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("Options Management", () => {
    it("should update options and reset selection", () => {
      useSearchStore.setState({ selectedResultIndex: 0 });

      useSearchStore.getState().setOptions({ caseSensitive: true });

      const state = useSearchStore.getState();
      expect(state.options.caseSensitive).toBe(true);
      expect(state.options.wholeWord).toBe(false); // Should preserve existing
      expect(state.selectedResultIndex).toBeNull();
      expect(state.error).toBeNull();
    });

    it("should update multiple options", () => {
      useSearchStore
        .getState()
        .setOptions({ caseSensitive: true, wholeWord: true });

      const options = useSearchStore.getState().options;
      expect(options.caseSensitive).toBe(true);
      expect(options.wholeWord).toBe(true);
    });
  });

  describe("Filter Management", () => {
    it("should set title filter and reset selection", () => {
      useSearchStore.setState({ selectedResultIndex: 1 });

      useSearchStore.getState().setTitleFilter("*Todo*");

      const state = useSearchStore.getState();
      expect(state.titleFilter).toBe("*Todo*");
      expect(state.selectedResultIndex).toBeNull();
      expect(state.error).toBeNull();
    });

    it("should set language filter and reset selection", () => {
      useSearchStore.setState({ selectedResultIndex: 2 });

      useSearchStore.getState().setLanguageFilter(["json", "javascript"]);

      const state = useSearchStore.getState();
      expect(state.languageFilter).toEqual(["json", "javascript"]);
      expect(state.selectedResultIndex).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("Search History", () => {
    it("should add query to history", () => {
      const query = "test query";

      useSearchStore.getState().addSearchToHistory(query);

      expect(useSearchStore.getState().searchHistory).toContain(query);
    });

    it("should not add empty queries to history", () => {
      useSearchStore.getState().addSearchToHistory("");
      useSearchStore.getState().addSearchToHistory("  ");
      useSearchStore.getState().addSearchToHistory("a"); // Too short

      expect(useSearchStore.getState().searchHistory).toEqual([]);
    });

    it("should prevent duplicate queries (case-insensitive)", () => {
      useSearchStore.getState().addSearchToHistory("Test Query");
      useSearchStore.getState().addSearchToHistory("test query");
      useSearchStore.getState().addSearchToHistory("TEST QUERY");

      expect(useSearchStore.getState().searchHistory).toEqual(["TEST QUERY"]);
    });

    it("should limit history to MAX_HISTORY items", () => {
      const MAX_HISTORY = 20;

      // Add more than MAX_HISTORY items
      for (let i = 0; i < MAX_HISTORY + 5; i++) {
        useSearchStore.getState().addSearchToHistory(`query ${i}`);
      }

      const history = useSearchStore.getState().searchHistory;
      expect(history.length).toBe(MAX_HISTORY);
      expect(history[0]).toBe("query 24"); // Most recent first
    });

    it("should clear search history", () => {
      useSearchStore.getState().addSearchToHistory("query 1");
      useSearchStore.getState().addSearchToHistory("query 2");

      useSearchStore.getState().clearHistory();

      expect(useSearchStore.getState().searchHistory).toEqual([]);
    });
  });

  describe("Results Management", () => {
    const mockResults: SearchResult[] = [
      {
        tabId: "tab1",
        workspaceId: "ws1",
        tabTitle: "Tab 1",
        language: "javascript",
        lineNumber: 1,
        lineText: 'console.log("hello");',
        matchIndex: 13,
        matchLength: 5,
        tabContent: 'console.log("hello");',
      },
      {
        tabId: "tab2",
        workspaceId: "ws1",
        tabTitle: "Tab 2",
        language: "json",
        lineNumber: 5,
        lineText: '  "test": "value"',
        matchIndex: 10,
        matchLength: 5,
        tabContent: '{\n  "test": "value"\n}',
      },
    ];

    it("should set results and auto-select first result", () => {
      useSearchStore.getState().setResults(mockResults);

      const state = useSearchStore.getState();
      expect(state.results).toBe(mockResults);
      expect(state.selectedResultIndex).toBe(0);
    });

    it("should set empty results with no selection", () => {
      useSearchStore.getState().setResults([]);

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.selectedResultIndex).toBeNull();
    });

    it("should set selected result index", () => {
      useSearchStore.getState().setSelectedResultIndex(1);

      expect(useSearchStore.getState().selectedResultIndex).toBe(1);
    });

    it("should clear results", () => {
      useSearchStore.setState({ results: mockResults, selectedResultIndex: 0 });

      useSearchStore.getState().clearResults();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.selectedResultIndex).toBeNull();
      expect(state.statusMessage).toBe("Results cleared.");
      expect(state.error).toBeNull();
    });
  });

  describe("Loading and Status Management", () => {
    it("should set loading state", () => {
      useSearchStore.getState().setLoading(true);
      expect(useSearchStore.getState().isLoading).toBe(true);

      useSearchStore.getState().setLoading(false);
      expect(useSearchStore.getState().isLoading).toBe(false);
    });

    it("should set status message", () => {
      useSearchStore.getState().setStatusMessage("Searching...");
      expect(useSearchStore.getState().statusMessage).toBe("Searching...");
    });

    it("should set error and stop loading", () => {
      useSearchStore.setState({ isLoading: true });

      useSearchStore.getState().setError("Search failed");

      const state = useSearchStore.getState();
      expect(state.error).toBe("Search failed");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("Close Search", () => {
    it("should close search with status message", () => {
      useSearchStore.setState({ isOpen: true });

      useSearchStore.getState().closeSearch();

      const state = useSearchStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.statusMessage).toBe("Search closed.");
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = useSearchStore.getState();
      const store2 = useSearchStore.getState();

      expect(store1.toggleSearch).toBe(store2.toggleSearch);
      expect(store1.setQuery).toBe(store2.setQuery);
      expect(store1.setScope).toBe(store2.setScope);
      expect(store1.setOptions).toBe(store2.setOptions);
      expect(store1.setTitleFilter).toBe(store2.setTitleFilter);
      expect(store1.setLanguageFilter).toBe(store2.setLanguageFilter);
      expect(store1.addSearchToHistory).toBe(store2.addSearchToHistory);
      expect(store1.clearHistory).toBe(store2.clearHistory);
      expect(store1.setResults).toBe(store2.setResults);
      expect(store1.setSelectedResultIndex).toBe(store2.setSelectedResultIndex);
      expect(store1.setLoading).toBe(store2.setLoading);
      expect(store1.setStatusMessage).toBe(store2.setStatusMessage);
      expect(store1.setError).toBe(store2.setError);
      expect(store1.clearResults).toBe(store2.clearResults);
      expect(store1.closeSearch).toBe(store2.closeSearch);
    });
  });

  describe("State Immutability", () => {
    it("should not mutate arrays passed to setResults", () => {
      const originalResults: SearchResult[] = [
        {
          tabId: "tab1",
          workspaceId: "ws1",
          tabTitle: "Tab 1",
          language: "javascript",
          lineNumber: 1,
          lineText: "test",
          matchIndex: 0,
          matchLength: 4,
          tabContent: "test",
        },
      ];

      const originalCopy = [...originalResults];

      useSearchStore.getState().setResults(originalResults);

      // Original should not be modified
      expect(originalResults).toEqual(originalCopy);

      // Store should reference the same array
      expect(useSearchStore.getState().results).toBe(originalResults);
    });

    it("should not mutate arrays passed to setLanguageFilter", () => {
      const originalLanguages = ["json", "javascript"];
      const originalCopy = [...originalLanguages];

      useSearchStore.getState().setLanguageFilter(originalLanguages);

      // Original should not be modified
      expect(originalLanguages).toEqual(originalCopy);

      // Store should reference the same array
      expect(useSearchStore.getState().languageFilter).toBe(originalLanguages);
    });
  });

  describe("Complex State Interactions", () => {
    it("should handle opening search with query, adding to history, and getting results", () => {
      const query = "test search";
      const mockResults: SearchResult[] = [
        {
          tabId: "tab1",
          workspaceId: "ws1",
          tabTitle: "Tab 1",
          language: "javascript",
          lineNumber: 1,
          lineText: "test search result",
          matchIndex: 0,
          matchLength: 11,
          tabContent: "test search result",
        },
      ];

      // Open search with query
      useSearchStore.getState().toggleSearch(query);

      // Add to history
      useSearchStore.getState().addSearchToHistory(query);

      // Set results
      useSearchStore.getState().setResults(mockResults);

      const state = useSearchStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.query).toBe(query);
      expect(state.searchHistory).toContain(query);
      expect(state.results).toBe(mockResults);
      expect(state.selectedResultIndex).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should clear error when setting query", () => {
      useSearchStore.setState({ error: "Previous error" });

      useSearchStore.getState().setQuery("new query");

      expect(useSearchStore.getState().error).toBeNull();
    });

    it("should clear error when changing scope", () => {
      useSearchStore.setState({ error: "Previous error" });

      useSearchStore.getState().setScope("allWorkspaces");

      expect(useSearchStore.getState().error).toBeNull();
    });

    it("should clear error when changing options", () => {
      useSearchStore.setState({ error: "Previous error" });

      useSearchStore.getState().setOptions({ caseSensitive: true });

      expect(useSearchStore.getState().error).toBeNull();
    });
  });
});
