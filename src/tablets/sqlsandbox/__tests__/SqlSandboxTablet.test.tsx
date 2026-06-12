import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SqlSandboxUI } from "../SqlSandboxUI";
import { SqlSandboxTablet } from "../SqlSandboxTablet";
import { stringifyJsonSafe, toCsv } from "../engine/exportResults";
import {
  QueryExecutionResult,
  RegisteredSource,
  SandboxSchema,
  SqlSandboxEngine,
  SqlSandboxSource,
  SqlSandboxTabletState,
} from "../sqlSandboxTypes";

const mockBridge = {
  createBackgroundTab: jest.fn().mockResolvedValue(undefined),
  getTabsInWorkspace: jest.fn().mockReturnValue([]),
  getTabContent: jest.fn().mockReturnValue(null),
  getDeviceInfo: jest.fn().mockReturnValue({ isMobile: false }),
  detectLanguage: jest.fn().mockReturnValue({ language: "plaintext", confidence: 1 }),
  splitView: {
    openInSplitView: jest.fn(),
    closeCurrentSplit: jest.fn(),
    isSplitViewActive: jest.fn().mockReturnValue(false),
  },
  modals: {
    suppressGlobalDragDrop: jest.fn(),
    isGlobalDragDropSuppressed: jest.fn().mockReturnValue(false),
  },
  getCurrentWorkspaceId: jest.fn().mockReturnValue("workspace-123"),
};

jest.mock("../../bridge/hook", () => ({
  useTabletBridge: jest.fn(() => mockBridge),
  useTabletTabCreation: jest.fn(() => ({
    createBackgroundTab: jest.fn().mockResolvedValue(undefined),
  })),
}));

class MockSqlEngine implements SqlSandboxEngine {
  sources: RegisteredSource[] = [];
  executeCalls: string[] = [];
  exportCalls: string[] = [];
  renameCalls: Array<{ sourceId: string; newTableName: string }> = [];
  dropCalls: string[] = [];
  initCount = 0;
  disposeCount = 0;
  disposed = false;

  async init() {
    this.initCount += 1;
    return undefined;
  }

  async registerSource(source: SqlSandboxSource) {
    const registered: RegisteredSource = {
      id: source.id,
      name: source.name,
      tableName: source.tableName,
      kind: source.kind,
      size: source.size,
    };
    this.sources.push(registered);
    return registered;
  }

  async renameSource(sourceId: string, newTableName: string): Promise<RegisteredSource> {
    this.renameCalls.push({ sourceId, newTableName });
    const source = this.sources.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);
    const updated = { ...source, tableName: newTableName };
    this.sources = this.sources.map((s) => (s.id === sourceId ? updated : s));
    return updated;
  }

  async dropSource(sourceId: string): Promise<void> {
    this.dropCalls.push(sourceId);
    this.sources = this.sources.filter((s) => s.id !== sourceId);
  }

  async execute(sql: string): Promise<QueryExecutionResult> {
    this.executeCalls.push(sql);
    return {
      sql,
      columns: ["id", "name", "total"],
      rows: [{ id: 1, name: "Ada", total: 1n }],
      rowCount: 1,
      executionMs: 12,
    };
  }

  async getSchema(): Promise<SandboxSchema> {
    return {
      sources: this.sources,
      tables: [],
      views: this.sources.map((source) => ({
        name: source.tableName,
        type: "view",
        columns: [
          { name: "id", engineType: "INTEGER", friendlyType: "integer" },
          { name: "name", engineType: "VARCHAR", friendlyType: "text" },
        ],
      })),
    };
  }

  async exportResult(result: QueryExecutionResult, format: "csv" | "json") {
    this.exportCalls.push(format);
    return new Blob([stringifyJsonSafe(result.rows)], { type: "text/plain" });
  }

  async reset() {
    this.sources = [];
  }

  async dispose() {
    this.disposeCount += 1;
    this.disposed = true;
  }
}

function renderSqlSandbox(engine = new MockSqlEngine()) {
  let currentState = SqlSandboxTablet.createInitialState() as SqlSandboxTabletState;
  const engineFactory = () => engine;
  const onChange = jest.fn((nextState: SqlSandboxTabletState) => {
    currentState = nextState;
    rerender(<SqlSandboxUI state={currentState} onChange={onChange} engineFactory={engineFactory} />);
  });

  const { rerender, unmount } = render(
    <SqlSandboxUI state={currentState} onChange={onChange} engineFactory={engineFactory} />,
  );

  return { engine, onChange, getState: () => currentState, unmount };
}

describe("SQL Sandbox tablet", () => {
  beforeEach(() => {
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.values(mockBridge).forEach((v) => {
      if (typeof v === "function" && "mockClear" in v) (v as jest.Mock).mockClear();
    });
    mockBridge.createBackgroundTab.mockResolvedValue(undefined);
    mockBridge.getTabsInWorkspace.mockReturnValue([]);
    mockBridge.getTabContent.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates serializable initial state", () => {
    const state = SqlSandboxTablet.createInitialState();
    const serialized = SqlSandboxTablet.serializeState(state);

    expect(SqlSandboxTablet.deserializeState(serialized)).toEqual(state);
    expect(state.data.query).toContain("SELECT 1");
  });

  it("creates initial state populated with a payload", () => {
    const payload = {
      content: "id,name\n1,Ada",
      title: "people.csv",
    };
    const state = SqlSandboxTablet.createInitialState(payload) as SqlSandboxTabletState;
    expect(state.data.query).toBe('SELECT * FROM "people" LIMIT 100;');
    expect(state.data.sources).toHaveLength(1);
    expect(state.data.sources[0].name).toBe("people.csv");
    expect(state.data.sources[0].tableName).toBe("people");
    expect(state.data.sources[0].persistedContent?.content).toBe("id,name\n1,Ada");

    const serialized = SqlSandboxTablet.serializeState(state);
    expect(SqlSandboxTablet.deserializeState(serialized)).toEqual(state);
  });

  it("registers a file, updates schema, runs a query, and exports", async () => {
    const user = userEvent.setup();
    const { engine, getState } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    const input = screen.getByTestId("sqlsandbox-file-input");
    const file = new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" });
    await act(async () => {
      await user.upload(input, file);
    });

    await waitFor(() => expect(screen.getByText("people.csv")).toBeInTheDocument());
    expect(getState().data.schema.views[0].name).toBe("people");
    expect(getState().data.query).toBe('SELECT * FROM "people" LIMIT 100;');

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Run$/ }));
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    expect(engine.executeCalls).toEqual(['SELECT * FROM "people" LIMIT 100;']);
    expect(getState().data.history).toHaveLength(1);

    expect(screen.getAllByTitle("1").length).toBeGreaterThan(0);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^CSV$/ }));
    });
    expect(engine.exportCalls).toEqual(["csv"]);
  });

  it("does not reinitialize the engine when onChange gets a new identity", async () => {
    const engine = new MockSqlEngine();
    const engineFactory = () => engine;
    const state = SqlSandboxTablet.createInitialState() as SqlSandboxTabletState;
    const { rerender } = render(
      <SqlSandboxUI state={state} onChange={jest.fn()} engineFactory={engineFactory} />,
    );

    await waitFor(() => expect(engine.initCount).toBe(1));

    rerender(<SqlSandboxUI state={state} onChange={jest.fn()} engineFactory={engineFactory} />);

    expect(engine.initCount).toBe(1);
    expect(engine.disposeCount).toBe(0);
  });

  it("restores the runtime result when the tablet remounts with the same state", async () => {
    const user = userEvent.setup();
    const engine = new MockSqlEngine();
    const firstRender = renderSqlSandbox(engine);

    await waitFor(() => expect(screen.getByRole("button", { name: /^Load Sample$/ })).not.toBeDisabled());
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Load Sample$/ }));
    });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Run$/ }));
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const preservedState = firstRender.getState();
    firstRender.unmount();
    expect(engine.disposeCount).toBe(0);

    render(
      <SqlSandboxUI
        state={preservedState}
        onChange={jest.fn()}
        engineFactory={() => engine}
      />,
    );

    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(engine.initCount).toBe(1);
  });

  it("loads a sample CSV by resetting the sandbox and registering sample data", async () => {
    const user = userEvent.setup();
    const { engine, getState } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByRole("button", { name: /^Load Sample$/ })).not.toBeDisabled());

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Load Sample$/ }));
    });

    await waitFor(() => expect(screen.getByText("sample_revenue.csv")).toBeInTheDocument());
    expect(engine.sources).toHaveLength(1);
    expect(getState().data.query).toBe('SELECT * FROM "sample_revenue" LIMIT 100;');
    expect(getState().data.history).toEqual([]);
    expect(getState().data.snapshots).toEqual([]);
    expect(getState().data.sources[0].persistedContent?.content).toContain("Ada Lovelace");
  });

  it("restores persisted source content after a fresh render", async () => {
    const engine = new MockSqlEngine();
    const baseState = SqlSandboxTablet.createInitialState() as SqlSandboxTabletState;
    const persistedState: SqlSandboxTabletState = {
      ...baseState,
      data: {
        ...baseState.data,
        sessionId: "fresh-persisted-session",
        query: 'SELECT * FROM "people" LIMIT 100;',
        sources: [
          {
            id: "persisted-people",
            name: "people.csv",
            tableName: "people",
            kind: "csv" as const,
            size: 13,
            persistedContent: {
              encoding: "text" as const,
              content: "id,name\n1,Ada",
              size: 13,
            },
            restoreStatus: "available" as const,
          },
        ],
        schema: {
          sources: [
            {
              id: "persisted-people",
              name: "people.csv",
              tableName: "people",
              kind: "csv" as const,
              size: 13,
            },
          ],
          tables: [],
          views: [
            {
              name: "people",
              type: "view" as const,
              columns: [{ name: "employee", engineType: "VARCHAR", friendlyType: "text" }],
            },
          ],
        },
      },
    };

    let currentState = persistedState;
    const onChange = jest.fn((nextState: SqlSandboxTabletState) => {
      currentState = nextState;
      rerender(<SqlSandboxUI state={currentState} onChange={onChange} engineFactory={() => engine} />);
    });
    const { rerender } = render(
      <SqlSandboxUI state={currentState} onChange={onChange} engineFactory={() => engine} />,
    );

    await waitFor(() => expect(engine.sources[0]?.tableName).toBe("people"));
    expect(currentState.data.schema.views[0].name).toBe("people");
    expect(currentState.data.sources[0].persistedContent?.content).toBe("id,name\n1,Ada");
    expect(screen.getByText("people.csv")).toBeInTheDocument();
  });

  it("persists query changes and snapshots", async () => {
    const user = userEvent.setup();
    const { getState } = renderSqlSandbox();

    const editor = screen.getByTestId("monaco-mock");
    fireEvent.change(editor, { target: { value: "select 42 as answer;" } });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Save Query$/ }));
    });
    expect(getState().data.query).toBe("select 42 as answer;");
    expect(getState().data.snapshots[0].sql).toBe("select 42 as answer;");
  });

  it("warns before destructive SQL when no snapshot exists", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const { engine } = renderSqlSandbox();

    const runButton = screen.getByRole("button", { name: /^Run$/ });
    await waitFor(() => expect(runButton).not.toBeDisabled());
    act(() => {
      fireEvent.change(screen.getByTestId("monaco-mock"), { target: { value: "delete from people;" } });
    });
    await act(async () => {
      await user.click(runButton);
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(engine.executeCalls).toEqual([]);
  });

  it("registers pasted CSV data successfully", async () => {
    const user = userEvent.setup();
    const { getState } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    // Click the Paste Data button
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Paste Data/i }));
    });

    // Enter table name and text area
    const nameInput = screen.getByPlaceholderText("pasted_data");
    fireEvent.change(nameInput, { target: { value: "my_pasted_table" } });

    const textarea = screen.getByPlaceholderText(/Paste CSV, TSV, JSON, or NDJSON/i);
    fireEvent.change(textarea, { target: { value: "col1,col2\nval1,val2" } });

    // Click Register Table
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Register Table/i }));
    });

    // Verify it uploaded as a file named "my_pasted_table.csv"
    await waitFor(() => expect(screen.getByText("my_pasted_table.csv")).toBeInTheDocument());
    expect(getState().data.schema.views[0].name).toBe("my_pasted_table");
  });

  it("shows From Tab picker and imports content from a workspace tab", async () => {
    const user = userEvent.setup();
    const tabCsv = "product,qty\napple,10\nbanana,20";
    mockBridge.getTabsInWorkspace.mockReturnValue([
      { id: "tab-abc", title: "products", language: "csv" },
      { id: "tab-def", title: "notes", language: "markdown" }, // should be filtered out
    ]);
    mockBridge.getTabContent.mockReturnValue(tabCsv);

    const { getState } = renderSqlSandbox();
    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /From Tab/i }));
    });

    // Only the importable tab appears (markdown filtered out)
    expect(screen.getByText("products")).toBeInTheDocument();
    expect(screen.queryByText("notes")).not.toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText("products"));
    });

    await waitFor(() => expect(screen.getByText("products.csv")).toBeInTheDocument());
    expect(getState().data.schema.views[0].name).toBe("products");
    expect(mockBridge.getTabContent).toHaveBeenCalledWith("tab-abc");
  });

  it("shows empty state in From Tab picker when no importable tabs exist", async () => {
    const user = userEvent.setup();
    mockBridge.getTabsInWorkspace.mockReturnValue([
      { id: "tab-md", title: "readme", language: "markdown" },
    ]);

    renderSqlSandbox();
    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /From Tab/i }));
    });

    expect(screen.getByText(/No CSV, TSV, JSON, or NDJSON tabs/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
    });

    expect(screen.queryByText(/No CSV, TSV, JSON, or NDJSON tabs/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /From Tab/i })).toBeInTheDocument();
  });

  it("defers engine disposal on unmount so quick tab switches can restore state", () => {
    const engine = new MockSqlEngine();
    const { unmount } = renderSqlSandbox(engine);

    unmount();
    expect(engine.disposed).toBe(false);
  });

  it("renames a source table name via inline edit", async () => {
    const user = userEvent.setup();
    const { engine, getState } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    const input = screen.getByTestId("sqlsandbox-file-input");
    const file = new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" });
    await act(async () => {
      await user.upload(input, file);
    });

    await waitFor(() => expect(screen.getByText("people.csv")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByTestId("source-rename-btn"));
    });

    const renameInput = screen.getByTestId("source-rename-input");
    await act(async () => {
      await user.clear(renameInput);
      await user.type(renameInput, "employees");
    });

    await act(async () => {
      await user.click(screen.getByTestId("source-rename-confirm"));
    });

    await waitFor(() => expect(engine.renameCalls).toHaveLength(1));
    expect(engine.renameCalls[0].newTableName).toBe("employees");
    expect(getState().data.schema.views[0].name).toBe("employees");
  });

  it("cancels an in-progress rename when escape is pressed", async () => {
    const user = userEvent.setup();
    const { engine } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    const input = screen.getByTestId("sqlsandbox-file-input");
    await act(async () => {
      await user.upload(input, new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" }));
    });

    await waitFor(() => expect(screen.getByText("people.csv")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByTestId("source-rename-btn"));
    });
    expect(screen.getByTestId("source-rename-input")).toBeInTheDocument();

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    expect(screen.queryByTestId("source-rename-input")).not.toBeInTheDocument();
    expect(engine.renameCalls).toHaveLength(0);
  });

  it("deletes a source from the engine and removes it from schema", async () => {
    const user = userEvent.setup();
    const { engine, getState } = renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    const input = screen.getByTestId("sqlsandbox-file-input");
    await act(async () => {
      await user.upload(input, new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" }));
    });

    await waitFor(() => expect(screen.getByText("people.csv")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByTestId("source-delete-btn"));
    });

    await waitFor(() => expect(engine.dropCalls).toHaveLength(1));
    expect(getState().data.sources).toHaveLength(0);
    expect(getState().data.schema.sources).toHaveLength(0);
    expect(screen.queryByText("people.csv")).not.toBeInTheDocument();
  });

  it("exports a source table as CSV and opens it in a background tab", async () => {
    const user = userEvent.setup();
    renderSqlSandbox();

    await waitFor(() => expect(screen.getByTestId("sqlsandbox-tablet")).toBeInTheDocument());

    const input = screen.getByTestId("sqlsandbox-file-input");
    await act(async () => {
      await user.upload(input, new File(["id,name\n1,Ada"], "people.csv", { type: "text/csv" }));
    });

    await waitFor(() => expect(screen.getByTestId("source-export-csv-btn")).toBeInTheDocument());

    await act(async () => {
      await user.click(screen.getByTestId("source-export-csv-btn"));
    });

    await waitFor(() => expect(mockBridge.createBackgroundTab).toHaveBeenCalledTimes(1));
    const opts = mockBridge.createBackgroundTab.mock.calls[0][0] as { title: string; content: string; language: string };
    expect(opts.title).toBe("people.csv");
    expect(opts.language).toBe("csv");
    expect(opts.content).toContain("id");
    expect(opts.content).toContain("Ada");
  });
});
