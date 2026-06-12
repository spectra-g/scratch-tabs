import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataImportPanel } from "./components/DataImportPanel";
import { ErrorPanel } from "./components/ErrorPanel";
import { QueryEditor, QueryEditorHandle } from "./components/QueryEditor";
import { QueryHistoryPanel } from "./components/QueryHistoryPanel";
import { ResultsTable } from "./components/ResultsTable";
import { SchemaSidebar } from "./components/SchemaSidebar";
import { SnapshotPanel } from "./components/SnapshotPanel";
import { Toolbar } from "./components/Toolbar";
import { useTabletBridge } from "../bridge/hook";
import { createSqlEngine, SqlEngineFactory } from "./engine/createSqlEngine";
import { attachPersistedContent, createSourceFromFile, quoteIdentifier } from "./engine/sourceRegistry";
import { toCsv } from "./engine/exportResults";
import { addHistoryItem, createHistoryItem } from "./engine/queryHistory";
import { addSnapshot, containsDestructiveStatement, createSnapshotRecord } from "./engine/snapshots";
import {
  ExportFormat,
  QueryExecutionResult,
  SqlSandboxEngine,
  SqlSandboxTabletState,
} from "./sqlSandboxTypes";

const DEFAULT_QUERY = "SELECT 1 AS ready;";
const RUNTIME_DISPOSE_DELAY_MS = 5 * 60 * 1000;
const SAMPLE_CSV = `department,employee,revenue,region,closed_at
Platform,Ada Lovelace,128500,EMEA,2026-01-15
Platform,Grace Hopper,142000,NA,2026-01-22
Security,Katherine Johnson,98000,NA,2026-02-04
Security,Dorothy Vaughan,116750,EMEA,2026-02-18
Data,Radia Perlman,154200,APAC,2026-03-02
Data,Barbara Liskov,137400,NA,2026-03-16
Developer Tools,Anita Borg,121900,EMEA,2026-04-01
Developer Tools,Frances Allen,149300,APAC,2026-04-14`;

interface RuntimeSession {
  engine: SqlSandboxEngine;
  initPromise: Promise<void> | null;
  result: QueryExecutionResult | null;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

const runtimeSessions = new Map<string, RuntimeSession>();

interface SqlSandboxUIProps {
  state: SqlSandboxTabletState;
  onChange: (state: SqlSandboxTabletState) => void;
  engineFactory?: SqlEngineFactory;
}

const IMPORTABLE_LANGUAGES = new Set(["csv", "tsv", "json", "ndjson"]);

export function SqlSandboxUI({ state, onChange, engineFactory = createSqlEngine }: SqlSandboxUIProps) {
  const bridge = useTabletBridge();
  const sessionIdRef = useRef(state.data.sessionId ?? createRuntimeSessionId());
  const runtimeSessionRef = useRef<RuntimeSession | null>(null);
  if (!runtimeSessionRef.current) {
    runtimeSessionRef.current = acquireRuntimeSession(sessionIdRef.current, engineFactory);
  }
  const engineRef = useRef<SqlSandboxEngine | null>(runtimeSessionRef.current.engine);
  const queryEditorRef = useRef<QueryEditorHandle | null>(null);
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryExecutionResult | null>(runtimeSessionRef.current.result);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  stateRef.current = state;
  onChangeRef.current = onChange;

  const updateData = useCallback(
    (patch: Partial<SqlSandboxTabletState["data"]>) => {
      const current = stateRef.current;
      onChangeRef.current({
        ...current,
        data: {
          ...current.data,
          ...patch,
        },
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const sessionId = sessionIdRef.current;
    const session = runtimeSessionRef.current!;
    const engine = session.engine;
    engineRef.current = engine;
    if (!stateRef.current.data.sessionId) {
      updateData({ sessionId: sessionIdRef.current });
    }

    session.initPromise = session.initPromise ?? engine.init();
    session.initPromise
      .then(async () => {
        if (cancelled) return;
        if (stateRef.current.data.sources.some((source) => source.persistedContent)) {
          const schema = await restorePersistedSources(engine, stateRef.current.data.sources);
          if (!cancelled) {
            updateData({
              sources: mergeSchemaSourcesWithPersistedContent(schema.sources, stateRef.current.data.sources),
              schema,
            });
          }
          return;
        }
        setResult(session.result);
        const schema = await engine.getSchema();
        if (!cancelled && (schema.sources.length > 0 || stateRef.current.data.sources.length === 0)) {
          updateData({ schema });
        }
      })
      .catch((error) => {
        if (!cancelled) setEngineError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
      scheduleRuntimeSessionDispose(sessionId);
    };
  }, [updateData]);

  const setQuery = (query: string) => updateData({ query });

  const runSql = useCallback(
    async (sql: string) => {
      const trimmedSql = sql.trim();
      const engine = engineRef.current;
      if (!engine || !trimmedSql || isRunning) return;

      if (
        containsDestructiveStatement(trimmedSql) &&
        stateRef.current.data.snapshots.length === 0 &&
        !window.confirm("Run destructive SQL without a snapshot?")
      ) {
        return;
      }

      setIsRunning(true);
      setEngineError(null);

      try {
        const executionResult = await engine.execute(trimmedSql);
        const schema = await engine.getSchema();
        const history = addHistoryItem(stateRef.current.data.history, createHistoryItem(executionResult));
        runtimeSessionRef.current!.result = executionResult;
        setResult(executionResult);
        updateData({ schema, history });
      } catch (error) {
        setEngineError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, updateData],
  );

  const registerFiles = async (files: File[]) => {
    const engine = engineRef.current;
    if (!engine || files.length === 0) return;

    setIsRunning(true);
    setEngineError(null);
    try {
      const existingNames = [
        ...stateRef.current.data.schema.tables.map((table) => table.name),
        ...stateRef.current.data.schema.views.map((table) => table.name),
      ];
      const registeredSources = [...stateRef.current.data.sources];
      for (const file of files) {
        const source = createSourceFromFile(file, existingNames);
        const registered = await engine.registerSource(source);
        registeredSources.push(await attachPersistedContent(registered, file));
        existingNames.push(registered.tableName);
      }
      const schema = await engine.getSchema();
      const currentQuery = stateRef.current.data.query.trim();
      updateData({
        sources: mergeSchemaSourcesWithPersistedContent(schema.sources, registeredSources),
        schema,
        query:
          !currentQuery || currentQuery === DEFAULT_QUERY
            ? createStarterQuery(schema.sources[0]?.tableName)
            : stateRef.current.data.query,
      });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const loadSampleCsv = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    setIsRunning(true);
    runtimeSessionRef.current!.result = null;
    setResult(null);
    setEngineError(null);

    try {
      await engine.reset();
      const sampleFile = new File([SAMPLE_CSV], "sample_revenue.csv", {
        type: "text/csv",
      });
      const source = createSourceFromFile(sampleFile, []);
      await engine.registerSource(source);
      const registeredSource = await attachPersistedContent(
        {
          id: source.id,
          name: source.name,
          tableName: source.tableName,
          kind: source.kind,
          size: source.size,
        },
        sampleFile,
      );
      const schema = await engine.getSchema();
      updateData({
        sources: mergeSchemaSourcesWithPersistedContent(schema.sources, [registeredSource]),
        schema,
        history: [],
        snapshots: [],
        query: createStarterQuery(source.tableName),
      });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const exportResult = async (format: ExportFormat) => {
    const engine = engineRef.current;
    if (!engine || !result || result.error) return;

    const blob = await engine.exportResult(result, format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sql-result.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  const reset = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    setIsRunning(true);
    runtimeSessionRef.current!.result = null;
    setResult(null);
    try {
      await engine.reset();
      const schema = await engine.getSchema();
      updateData({ sources: [], schema });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const renameSource = async (sourceId: string, newTableName: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsRunning(true);
    setEngineError(null);
    try {
      await engine.renameSource(sourceId, newTableName);
      const schema = await engine.getSchema();
      updateData({
        sources: mergeSchemaSourcesWithPersistedContent(schema.sources, stateRef.current.data.sources),
        schema,
      });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const deleteSource = async (sourceId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsRunning(true);
    setEngineError(null);
    try {
      await engine.dropSource(sourceId);
      const schema = await engine.getSchema();
      const remainingSources = stateRef.current.data.sources.filter((s) => s.id !== sourceId);
      updateData({
        sources: mergeSchemaSourcesWithPersistedContent(schema.sources, remainingSources),
        schema,
      });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const exportSourceCsv = async (tableName: string, sourceName: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      const executionResult = await engine.execute(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      if (!executionResult.error) {
        const fileName = sourceName.replace(/\.[^.]+$/, "") + ".csv";
        await bridge.createBackgroundTab({
          title: fileName,
          content: toCsv(executionResult.columns, executionResult.rows),
          language: "csv",
          languageLocked: false,
        });
      }
    } catch {
      // silently skip export errors
    }
  };

  const importFromTab = async (tabId: string) => {
    const content = bridge.getTabContent(tabId);
    if (content === null) return;
    const tab = bridge.getTabsInWorkspace().find((t) => t.id === tabId);
    if (!tab) return;
    const ext = tab.language === "ndjson" ? "ndjson" : tab.language;
    const mimeType = tab.language === "json" || tab.language === "ndjson" ? "application/json" : "text/csv";
    const file = new File([content], `${tab.title}.${ext}`, { type: mimeType });
    await registerFiles([file]);
  };

  const getImportableTabs = () =>
    bridge.getTabsInWorkspace().filter((t) => IMPORTABLE_LANGUAGES.has(t.language));

  const createSnapshot = () => {
    const snapshot = createSnapshotRecord(stateRef.current.data.query);
    updateData({
      snapshots: addSnapshot(stateRef.current.data.snapshots, snapshot),
    });
  };

  const insertSql = (sql: string) => {
    const currentQuery = stateRef.current.data.query;
    updateData({
      query: currentQuery.trim() ? `${currentQuery}\n${sql}` : sql,
    });
  };

  const lastResultMeta = useMemo(
    () =>
      result && !result.error
        ? { executionMs: result.executionMs, rowCount: result.rowCount }
        : undefined,
    [result],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-main" data-testid="sqlsandbox-tablet">
      <Toolbar
        canExport={!!result && !result.error && result.columns.length > 0}
        isRunning={isRunning || isInitializing}
        lastExecutionMs={lastResultMeta?.executionMs}
        rowCount={lastResultMeta?.rowCount}
        onRun={() => void runSql(state.data.query)}
        onRunSelected={() => void runSql(queryEditorRef.current?.getSelectedSql() || state.data.query)}
        onExportCsv={() => void exportResult("csv")}
        onExportJson={() => void exportResult("json")}
        onLoadSample={() => void loadSampleCsv()}
        onReset={() => void reset()}
        onSnapshot={createSnapshot}
        onToggleHistory={() => setShowHistory((visible) => !visible)}
      />

      {engineError && (
        <div className="border-b border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger">
          {engineError}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] overflow-hidden max-lg:grid-cols-1">
        <SchemaSidebar
          schema={state.data.schema}
          onInsertSql={insertSql}
          onRenameSource={(id, name) => void renameSource(id, name)}
          onDeleteSource={(id) => void deleteSource(id)}
          onExportSourceCsv={(tableName, sourceName) => void exportSourceCsv(tableName, sourceName)}
        />
        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(220px,42%)_minmax(0,1fr)_auto]">
          <div className="min-w-0 overflow-hidden p-3">
            <DataImportPanel
              isLoading={isRunning || isInitializing}
              onFilesSelected={registerFiles}
              getImportableTabs={getImportableTabs}
              onTabImport={importFromTab}
            />
          </div>
          <div className="min-w-0 overflow-hidden">
            <QueryEditor
              ref={queryEditorRef}
              query={state.data.query}
              onChange={setQuery}
              onRun={() => void runSql(stateRef.current.data.query)}
              onRunSelected={(sql) => void runSql(sql || stateRef.current.data.query)}
            />
          </div>
          <div className="h-full min-h-0 min-w-0 border-t border-base">
            <ResultsTable result={result} isRunning={isRunning || isInitializing} />
          </div>
          <ErrorPanel error={result?.error} />
          <SnapshotPanel snapshots={state.data.snapshots} onRestoreQuery={setQuery} />
        </div>
        {showHistory && (
          <div className="hidden w-80 max-lg:block">
            <QueryHistoryPanel history={state.data.history} onRestore={setQuery} />
          </div>
        )}
      </div>

      {showHistory && (
        <div className="absolute right-0 top-[49px] z-20 h-[calc(100%-49px)] w-80 shadow-xl max-lg:hidden">
          <QueryHistoryPanel history={state.data.history} onRestore={setQuery} />
        </div>
      )}
    </div>
  );
}

function acquireRuntimeSession(
  sessionId: string,
  engineFactory: SqlEngineFactory,
): RuntimeSession {
  const existing = runtimeSessions.get(sessionId);
  if (existing) {
    if (existing.disposeTimer) {
      clearTimeout(existing.disposeTimer);
      existing.disposeTimer = null;
    }
    return existing;
  }

  const session: RuntimeSession = {
    engine: engineFactory(),
    initPromise: null,
    result: null,
    disposeTimer: null,
  };
  runtimeSessions.set(sessionId, session);
  return session;
}

function scheduleRuntimeSessionDispose(sessionId: string): void {
  const session = runtimeSessions.get(sessionId);
  if (!session || session.disposeTimer) return;

  session.disposeTimer = setTimeout(() => {
    runtimeSessions.delete(sessionId);
    void session.engine.dispose();
  }, RUNTIME_DISPOSE_DELAY_MS);
  const timerWithUnref = session.disposeTimer as ReturnType<typeof setTimeout> & {
    unref?: () => void;
  };
  timerWithUnref.unref?.();
}

async function restorePersistedSources(
  engine: SqlSandboxEngine,
  sources: SqlSandboxTabletState["data"]["sources"],
) {
  const schema = await engine.getSchema();
  if (schema.sources.length > 0) {
    return schema;
  }

  for (const source of sources) {
    if (!source.persistedContent) continue;
    await engine.registerSource({
      id: source.id,
      name: source.name,
      tableName: source.tableName,
      kind: source.kind,
      size: source.size,
      text: source.persistedContent.content,
    });
  }

  return engine.getSchema();
}

function mergeSchemaSourcesWithPersistedContent(
  schemaSources: SqlSandboxTabletState["data"]["sources"],
  persistedSources: SqlSandboxTabletState["data"]["sources"],
) {
  const persistedById = new Map(persistedSources.map((source) => [source.id, source]));
  return schemaSources.map((source) => ({
    ...source,
    persistedContent: persistedById.get(source.id)?.persistedContent,
    restoreStatus: persistedById.get(source.id)?.restoreStatus,
  }));
}

function createRuntimeSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sqlsandbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStarterQuery(tableName?: string): string {
  if (!tableName) {
    return "SELECT 1 AS ready;";
  }
  return `SELECT * FROM "${tableName}" LIMIT 100;`;
}
