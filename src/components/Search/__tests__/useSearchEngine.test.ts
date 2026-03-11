import { renderHook } from "@testing-library/react";
import { useSearchEngine } from "../useSearchEngine";

jest.mock("../../../db", () => ({
  StorageProviderFactory: {
    getProvider: () => ({
      getTabs: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock("../../../stores/searchStore", () => ({
  useSearchStore: jest.fn((selector?: (state: any) => any) => {
    const state = {
      isOpen: false,
      closeSearch: jest.fn(),
      query: "",
      setQuery: jest.fn(),
      results: [],
      selectedResultIndex: null,
      setSelectedResultIndex: jest.fn(),
      scope: "activeWorkspace",
      setScope: jest.fn(),
      options: {},
      setOptions: jest.fn(),
      titleFilter: "",
      setTitleFilter: jest.fn(),
      languageFilter: [],
      setLanguageFilter: jest.fn(),
      searchHistory: [],
      addSearchToHistory: jest.fn(),
      clearHistory: jest.fn(),
      isLoading: false,
      statusMessage: "",
      error: null,
      setLoading: jest.fn(),
      setError: jest.fn(),
      setResults: jest.fn(),
      setStatusMessage: jest.fn(),
    };

    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(() => ({
    setActiveLeftTab: jest.fn(),
    setActiveRightTab: jest.fn(),
    setActiveSide: jest.fn(),
  })),
}));

jest.mock("../../../stores/workspaceStore", () => ({
  useWorkspaceStore: jest.fn(() => ({
    switchWorkspace: jest.fn(),
    activeWorkspaceId: "workspace-1",
  })),
}));

jest.mock("../../../stores/tabsStore", () => ({
  useTabsStore: jest.fn(() => ({
    tabs: [],
  })),
}));

jest.mock("../../../stores/splitViewStore", () => ({
  useSplitViewStore: jest.fn(() => ({})),
}));

jest.mock("../../../services/searchService", () => ({
  searchTabs: jest.fn(() => []),
}));

describe("useSearchEngine TOML filters", () => {
  it("includes TOML in the language filter options", () => {
    const { result } = renderHook(() => useSearchEngine());
    const toml = result.current.languages.find((language) => language.id === "toml");

    expect(toml).toMatchObject({
      id: "toml",
      name: "TOML",
    });
  });
});
