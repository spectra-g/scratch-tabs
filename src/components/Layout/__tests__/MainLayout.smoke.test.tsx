/**
 * Smoke tests for MainLayout
 *
 * These tests verify that MainLayout can be imported and rendered without errors.
 * They catch issues like missing imports, undefined variables, and basic render failures.
 */

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock heavy dependencies to make tests fast
jest.mock("../../../stores/tabsStore", () => ({
  useTabsStore: jest.fn().mockReturnValue({ tabs: [] }),
}));

jest.mock("../../../stores/splitViewStore", () => ({
  useSplitViewStore: jest.fn(),
}));

jest.mock("../../../stores/rootStore", () => ({
  useRootStore: jest.fn(),
}));

jest.mock("../../../stores/workspaceStore", () => ({
  useWorkspaceStore: jest.fn(),
}));

jest.mock("../../../stores/persistenceStore", () => ({
  usePersistenceStore: jest.fn(),
}));

jest.mock("../../../stores/searchStore", () => ({
  useSearchStore: jest.fn().mockReturnValue({ isOpen: false }),
}));

jest.mock("../../../stores/aiStore", () => ({
  useAIStore: jest.fn(),
}));

jest.mock("zustand/traditional", () => ({
  useStoreWithEqualityFn: jest.fn().mockReturnValue({
    splitView: { isSplit: false, leftTabs: [], rightTabs: [] },
    setSplitRatio: jest.fn(),
    handleNewPopulatedTab: jest.fn(),
    loadWorkspaces: jest.fn().mockResolvedValue(undefined),
    workspaces: [],
    saveState: jest.fn(),
    setSummaryModalCallback: jest.fn(),
  }),
}));

jest.mock("../../../hooks/useUrlTabHandler", () => ({
  useUrlTabHandler: jest.fn(),
  handleInitialUrl: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../hooks/useSplitViewResizer", () => ({
  useSplitViewResizer: jest.fn().mockReturnValue({
    containerRef: { current: null },
    dividerProps: {},
    leftPaneStyle: {},
    rightPaneStyle: {},
    isDragging: false,
  }),
}));

jest.mock("../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: jest.fn(),
}));

jest.mock("../../../hooks/useAutoSave", () => ({
  useAutoSave: jest.fn(),
}));

jest.mock("../../../hooks/useAppHotkeys", () => ({
  useAppHotkeys: jest.fn().mockReturnValue({
    keyboardCloseConfirmation: null,
    handleKeyboardCloseConfirm: jest.fn(),
    handleKeyboardCloseCancel: jest.fn(),
  }),
}));

// Mock child components to avoid deep dependency chains
jest.mock("../../Welcome/WelcomeScreen", () => ({
  WelcomeScreen: () => <div data-testid="welcome-screen">Welcome</div>,
}));

jest.mock("../../Tab/TabBar", () => ({
  TabBar: () => <div data-testid="tab-bar">TabBar</div>,
}));

jest.mock("../../Editor/EditorPaneWrapper", () => ({
  EditorPaneWrapper: () => <div data-testid="editor-pane">Editor</div>,
}));

jest.mock("../../SplitView/SplitViewDivider", () => ({
  SplitViewDivider: () => <div data-testid="split-divider">Divider</div>,
}));

jest.mock("../../DiffModal", () => ({
  DiffModal: () => <div data-testid="diff-modal">DiffModal</div>,
}));

jest.mock("../../AI/SummarizeModal", () => ({
  SummarizeModal: () => <div data-testid="summarize-modal">SummarizeModal</div>,
}));

jest.mock("../../Search/SearchModal", () => ({
  SearchModal: () => <div data-testid="search-modal">SearchModal</div>,
}));

jest.mock("../../AI/AIModelManagementModal", () => ({
  AIModelManagementModal: () => <div data-testid="ai-modal">AIModal</div>,
}));

jest.mock("../../Tab/ConfirmationDialog", () => ({
  ConfirmationDialog: () => <div data-testid="confirmation-dialog">ConfirmDialog</div>,
}));

jest.mock("../../TestFields/TestFields", () => ({
  TestFields: () => <div data-testid="test-fields">TestFields</div>,
}));

jest.mock("../../MilestoneCelebration", () => ({
  MilestoneToast: () => <div data-testid="milestone-toast">Toast</div>,
  MilestoneModal: () => <div data-testid="milestone-modal">Modal</div>,
}));

// Import MainLayout after mocks
import MainLayout from "../MainLayout";

describe("MainLayout Smoke Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should import MainLayout without errors", () => {
    expect(MainLayout).toBeDefined();
    expect(typeof MainLayout).toBe("function");
  });

  it("should render without throwing", () => {
    expect(() => {
      render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it("should render loading state initially", () => {
    const { getByText } = render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    // Should show loading state before workspaces are loaded
    expect(getByText("Loading tabs...")).toBeInTheDocument();
  });
});
