import React, { useState, useEffect, useRef } from "react";
import { Tablet, TabletState } from "../types";
import {
  Network,
  AlertCircle,
  Play,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
  History,
  Pin,
  Trash2,
  X,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Book,
  Code,
  Zap,
} from "../../components/Icons";
import { SensitiveDataManager } from "../../utils/sensitiveDataManager";
import {
  introspectSchema,
  executeGraphQLQuery,
  GraphQLWebSocketClient,
  formatTypeRef,
  getRootTypes,
  findTypeByName,
  isBuiltInType,
  parseVariables,
  detectOperationType,
  extractOperationNames,
  GraphQLSchema,
  GraphQLType,
  GraphQLField,
} from "./utils/graphqlUtils";
import {
  GraphQLTabletState,
  GraphQLQueryHistoryItem,
  GraphQLResponse,
  SubscriptionMessage,
  KeyValuePair,
} from "./types";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";


interface GraphQLTabletStateWrapper extends TabletState {
  type: "graphql";
  data: GraphQLTabletState;
}

// Monaco Editor Component
const MonacoEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  height?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}> = ({ value, onChange, language, readOnly = false, height = "100%", onMount }) => {
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    if (onMount) {
      onMount(editor);
    }
  };

  return (
    <div style={{ height }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
};

// --- All Sub-Components Go Here (Unchanged) ---
// (UrlBar, SchemaExplorer, QueryHistory, HeadersEditor, ResponseViewer)
const UrlBar: React.FC<{
  endpoint: string;
  onEndpointChange: (endpoint: string) => void;
  onLoadSchema: () => void;
  isLoadingSchema: boolean;
}> = ({ endpoint, onEndpointChange, onLoadSchema, isLoadingSchema }) => {
  return (
    <div className="flex items-center space-x-2 p-3 border-b border-gray-700/50">
      <input
        type="text"
        value={endpoint}
        onChange={(e) => onEndpointChange(e.target.value)}
        placeholder="https://api.example.com/graphql"
        className="flex-1 bg-gray-800 text-gray-100 px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={onLoadSchema}
        disabled={isLoadingSchema || !endpoint}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {isLoadingSchema ? (
          <><Loader2 size={16} className="animate-spin" /><span>Loading...</span></>
        ) : (
          <><RefreshCw size={16} /><span>Load Schema</span></>
        )}
      </button>
    </div>
  );
};

const SchemaExplorer: React.FC<{
  schema: GraphQLSchema | null;
  schemaError: string | null;
  selectedType: string | null;
  onTypeSelect: (typeName: string) => void;
  onFieldClick: (fieldName: string, typeName: string) => void;
}> = ({ schema, schemaError, selectedType, onTypeSelect, onFieldClick }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["queries", "mutations", "subscriptions"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    newExpanded.has(section) ? newExpanded.delete(section) : newExpanded.add(section);
    setExpandedSections(newExpanded);
  };
  const toggleType = (typeName: string) => {
    const newExpanded = new Set(expandedTypes);
    newExpanded.has(typeName) ? newExpanded.delete(typeName) : newExpanded.add(typeName);
    setExpandedTypes(newExpanded);
  };
  if (schemaError) return <div className="h-full bg-gray-900 p-4"><div className="flex items-center space-x-2 text-red-400 mb-4"><XCircle size={16} /><span className="font-medium">Schema Error</span></div><p className="text-sm text-gray-400">{schemaError}</p></div>;
  if (!schema) return <div className="h-full bg-gray-900 p-4 flex items-center justify-center"><div className="text-center text-gray-400"><Book size={48} className="mx-auto mb-3 opacity-50" /><p className="text-sm">Load a schema to explore</p></div></div>;
  const rootTypes = getRootTypes(schema);
  const userTypes = schema.types.filter(t => !isBuiltInType(t.name || "") && t.kind === "OBJECT");
  const filterFields = (fields: GraphQLField[]) => !searchQuery ? fields : fields.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const renderField = (field: GraphQLField, typeName: string) => <div key={field.name} className="py-2 px-4 hover:bg-gray-700/30 cursor-pointer text-sm" onClick={() => onFieldClick(field.name, typeName)}><div className="flex items-start justify-between"><div className="flex-1"><span className="text-blue-400 font-medium">{field.name}</span>{field.args.length > 0 && <span className="text-gray-500 ml-1">({field.args.map(a => a.name).join(", ")})</span>}<span className="text-gray-500 ml-2">: {formatTypeRef(field.type)}</span></div></div>{field.description && <p className="text-xs text-gray-400 mt-1">{field.description}</p>}</div>;
  const renderSection = (title: string, fields: GraphQLField[], icon: React.ReactNode, sectionKey: string) => {
    const filteredFields = filterFields(fields);
    if (filteredFields.length === 0 && searchQuery) return null;
    return <div className="border-b border-gray-700/50"><button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"><div className="flex items-center space-x-2">{icon}<span className="font-medium text-gray-100">{title}</span><span className="text-xs text-gray-500">({fields.length})</span></div>{expandedSections.has(sectionKey) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}</button>{expandedSections.has(sectionKey) && <div className="bg-gray-800/50">{filteredFields.map(field => renderField(field, sectionKey))}</div>}</div>;
  };
  const selectedTypeObj = selectedType ? findTypeByName(schema, selectedType) : null;
  return <div className="h-full bg-gray-900 flex flex-col"><div className="flex-none p-3 border-b border-gray-700/50"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search fields..." className="w-full bg-gray-800 text-gray-100 pl-10 pr-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm" /></div></div><div className="flex-1 overflow-y-auto custom-scrollbar">{rootTypes.queries.length > 0 && renderSection("Queries", rootTypes.queries, <Code size={16} className="text-green-400" />, "queries")}{rootTypes.mutations.length > 0 && renderSection("Mutations", rootTypes.mutations, <Zap size={16} className="text-yellow-400" />, "mutations")}{rootTypes.subscriptions.length > 0 && renderSection("Subscriptions", rootTypes.subscriptions, <RefreshCw size={16} className="text-purple-400" />, "subscriptions")}{userTypes.length > 0 && <div className="border-b border-gray-700/50"><button onClick={() => toggleSection("types")} className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"><div className="flex items-center space-x-2"><Book size={16} className="text-blue-400" /><span className="font-medium text-gray-100">Types</span><span className="text-xs text-gray-500">({userTypes.length})</span></div>{expandedSections.has("types") ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}</button>{expandedSections.has("types") && <div className="bg-gray-800/50">{userTypes.map(type => <div key={type.name} className="border-b border-gray-700/30"><button onClick={() => { onTypeSelect(type.name!); toggleType(type.name!); }} className="w-full flex items-center justify-between p-2 px-4 hover:bg-gray-700/30 text-sm"><span className="text-blue-300">{type.name}</span>{expandedTypes.has(type.name!) ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}</button>{expandedTypes.has(type.name!) && type.fields && <div className="bg-gray-900/50">{type.fields.map(field => renderField(field, type.name!))}</div>}</div>)}</div>}</div>}</div>{selectedTypeObj && <div className="flex-none p-3 border-t border-gray-700/50 bg-gray-800"><div className="text-xs text-gray-400"><div className="font-medium text-gray-300 mb-1">{selectedTypeObj.name}</div>{selectedTypeObj.description && <p>{selectedTypeObj.description}</p>}</div></div>}</div>;
};

const QueryHistory: React.FC<{
  history: GraphQLQueryHistoryItem[];
  onRestore: (item: GraphQLQueryHistoryItem) => void;
  onPin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ history, onRestore, onPin, onDelete, onClose }) => {
  const sortedHistory = [...history].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
  return <div className="h-full bg-gray-900 flex flex-col"><div className="flex-none flex items-center justify-between p-3 border-b border-gray-700/50"><div className="flex items-center space-x-2"><History size={18} className="text-gray-400" /><span className="font-medium text-gray-100">Query History</span><span className="text-xs text-gray-500">({history.length})</span></div><button onClick={onClose} className="text-gray-400 hover:text-gray-100 transition-colors"><X size={18} /></button></div><div className="flex-1 overflow-y-auto custom-scrollbar">{sortedHistory.length === 0 ? <div className="p-8 text-center text-gray-400"><Clock size={48} className="mx-auto mb-3 opacity-50" /><p className="text-sm">No query history yet</p></div> : sortedHistory.map(item => <div key={item.id} className="p-3 border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors"><div className="flex items-start justify-between mb-2"><div className="flex-1"><div className="text-sm font-medium text-gray-100 mb-1">{item.name || "Unnamed Query"}</div><div className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</div></div><div className="flex items-center space-x-2"><button onClick={() => onPin(item.id, !item.isPinned)} className={`${item.isPinned ? "text-yellow-400" : "text-gray-500"} hover:text-yellow-400 transition-colors`}><Pin size={14} /></button><button onClick={() => onDelete(item.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button></div></div><pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto mb-2">{item.query.substring(0, 100)}{item.query.length > 100 && "..."}</pre><button onClick={() => onRestore(item)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Restore</button></div>)}</div></div>;
};

const HeadersEditor: React.FC<{
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
}> = ({ headers, onChange }) => {
  const addHeader = () => onChange([...headers, { key: "", value: "", enabled: true }]);
  const updateHeader = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    onChange(newHeaders);
  };
  const removeHeader = (index: number) => onChange(headers.filter((_, i) => i !== index));
  return <div className="h-full bg-gray-900 flex flex-col"><div className="flex-1 overflow-y-auto p-4"><div className="space-y-2">{headers.map((header, index) => <div key={index} className="flex items-center space-x-2"><input type="checkbox" checked={header.enabled} onChange={e => updateHeader(index, "enabled", e.target.checked)} className="w-4 h-4" /><input type="text" value={header.key} onChange={e => updateHeader(index, "key", e.target.value)} placeholder="Header name" className="flex-1 bg-gray-800 text-gray-100 px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm" /><input type="text" value={header.value} onChange={e => updateHeader(index, "value", e.target.value)} placeholder="Value" className="flex-1 bg-gray-800 text-gray-100 px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm" /><button onClick={() => removeHeader(index)} className="text-gray-400 hover:text-red-400 transition-colors"><X size={16} /></button></div>)}</div><button onClick={addHeader} className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors">+ Add Header</button></div></div>;
};

const ResponseViewer: React.FC<{
  response: GraphQLResponse | null;
  error: string | null;
  isLoading: boolean;
  subscriptionMessages: SubscriptionMessage[];
  isSubscriptionActive: boolean;
  onShowHistory: () => void;
  historyCount: number;
}> = ({ response, error, isLoading, subscriptionMessages, isSubscriptionActive, onShowHistory, historyCount }) => {
  const [activeTab, setActiveTab] = useState<"data" | "errors" | "subscription">("data");
  const formatJson = (obj: any) => { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } };
  return <div className="h-full bg-gray-900 flex flex-col"><div className="flex-none flex items-center justify-between p-3 border-b border-gray-700/50"><div className="flex items-center space-x-4"><button onClick={() => setActiveTab("data")} className={`text-sm ${activeTab === "data" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-100"} pb-1`}>Response</button>{response?.errors && response.errors.length > 0 && <button onClick={() => setActiveTab("errors")} className={`text-sm ${activeTab === "errors" ? "text-red-400 border-b-2 border-red-400" : "text-gray-400 hover:text-gray-100"} pb-1 flex items-center space-x-1`}><XCircle size={14} /><span>Errors ({response.errors.length})</span></button>}{(isSubscriptionActive || subscriptionMessages.length > 0) && <button onClick={() => setActiveTab("subscription")} className={`text-sm ${activeTab === "subscription" ? "text-purple-400 border-b-2 border-purple-400" : "text-gray-400 hover:text-gray-100"} pb-1 flex items-center space-x-1`}><RefreshCw size={14} className={isSubscriptionActive ? "animate-spin" : ""} /><span>Subscription ({subscriptionMessages.length})</span></button>}</div><button onClick={onShowHistory} className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"><History size={16} /><span>History</span>{historyCount > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{historyCount}</span>}</button></div>{response && <div className="flex-none flex items-center justify-between px-4 py-2 bg-gray-800/50 text-xs"><div className="flex items-center space-x-4"><div className="flex items-center space-x-2"><span className="text-gray-400">Status:</span><span className={`font-medium ${response.status === 200 ? "text-green-400" : "text-red-400"}`}>{response.status} {response.statusText}</span></div><div className="flex items-center space-x-2"><Clock size={12} className="text-gray-400" /><span className="text-gray-300">{response.responseTime.toFixed(0)}ms</span></div><div className="flex items-center space-x-2"><span className="text-gray-400">Size:</span><span className="text-gray-300">{(response.size / 1024).toFixed(2)} KB</span></div></div></div>}<div className="flex-1 overflow-hidden">{isLoading ? <div className="h-full flex items-center justify-center"><div className="text-center"><Loader2 size={48} className="mx-auto mb-3 text-blue-400 animate-spin" /><p className="text-sm text-gray-400">Executing query...</p></div></div> : error ? <div className="h-full p-4"><div className="flex items-center space-x-2 text-red-400 mb-3"><XCircle size={16} /><span className="font-medium">Error</span></div><pre className="text-sm text-gray-300 bg-gray-800 p-4 rounded overflow-auto">{error}</pre></div> : response ? <div className="h-full">{activeTab === "data" && <MonacoEditor value={formatJson(response.data)} onChange={() => { }} language="json" readOnly />}{activeTab === "errors" && response.errors && <div className="h-full overflow-y-auto p-4">{response.errors.map((err, index) => <div key={index} className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded"><div className="flex items-start space-x-2 mb-2"><XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" /><div className="flex-1"><p className="text-sm text-red-300 font-medium">{err.message}</p>{err.path && <p className="text-xs text-gray-400 mt-1">Path: {err.path.join(" > ")}</p>}{err.locations && <p className="text-xs text-gray-400 mt-1">Location: Line {err.locations[0]?.line}, Column {err.locations[0]?.column}</p>}</div></div></div>)}</div>}{activeTab === "subscription" && <div className="h-full overflow-y-auto p-4">{subscriptionMessages.length === 0 ? <div className="text-center text-gray-400 mt-8"><RefreshCw size={48} className="mx-auto mb-3 opacity-50" /><p className="text-sm">{isSubscriptionActive ? "Waiting for subscription data..." : "No subscription messages yet"}</p></div> : <div className="space-y-2">{subscriptionMessages.map(msg => <div key={msg.id} className={`p-3 rounded border ${msg.type === "error" ? "bg-red-900/20 border-red-700/50" : msg.type === "complete" ? "bg-gray-800 border-gray-700" : "bg-green-900/20 border-green-700/50"}`}><div className="flex items-center justify-between mb-2"><div className="flex items-center space-x-2">{msg.type === "error" ? <XCircle size={14} className="text-red-400" /> : msg.type === "complete" ? <CheckCircle size={14} className="text-gray-400" /> : <CheckCircle size={14} className="text-green-400" />}<span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span></div><span className="text-xs text-gray-500 uppercase">{msg.type}</span></div>{msg.data && <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto">{formatJson(msg.data)}</pre>}{msg.errors && <div className="text-xs text-red-300 mt-2">{msg.errors.map((err, i) => <div key={i}>{err.message}</div>)}</div>}</div>)}</div>}</div>}</div> : <div className="h-full flex items-center justify-center"><div className="text-center text-gray-400"><Play size={48} className="mx-auto mb-3 opacity-50" /><p className="text-sm">Execute a query to see results</p></div></div>}</div></div>;
};

/**
 * Main GraphQL Tablet UI Component
 * This is the self-contained React component that uses hooks.
 */
const GraphQLTabletComponent: React.FC<{
  state: GraphQLTabletStateWrapper;
  onChange: (state: GraphQLTabletStateWrapper) => void;
}> = ({ state, onChange }) => {
  const { data } = state;
  const [showHistory, setShowHistory] = useState(false);
  const wsClientRef = useRef<GraphQLWebSocketClient | null>(null);
  const queryEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const updateState = (newData: Partial<GraphQLTabletState>) => {
    onChange({
      ...state,
      data: {
        ...data,
        ...newData,
      },
    });
  };

  const handleLoadSchema = async () => {
    if (!data.endpoint) return;
    updateState({ isLoadingSchema: true, schemaError: null });
    const headers: Record<string, string> = {};
    data.headers
      .filter((h) => h.enabled)
      .forEach((h) => {
        headers[h.key] = SensitiveDataManager.unmask(h.value);
      });
    const result = await introspectSchema(data.endpoint, headers);
    if (result.error) {
      updateState({
        isLoadingSchema: false,
        schemaError: result.error,
        schema: null,
      });
    } else {
      updateState({
        isLoadingSchema: false,
        schema: result.schema,
        schemaError: null,
      });
    }
  };

  const handleExecuteQuery = async () => {
    if (!data.endpoint || !data.query) return;
    const operationType = detectOperationType(data.query);
    if (operationType === "subscription") {
      handleStartSubscription();
      return;
    }
    updateState({ isExecuting: true, error: null });
    const headers: Record<string, string> = {};
    data.headers
      .filter((h) => h.enabled)
      .forEach((h) => {
        headers[h.key] = SensitiveDataManager.unmask(h.value);
      });
    let variables = {};
    try {
      variables = parseVariables(data.variables);
    } catch (error) {
      updateState({
        isExecuting: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const response = await executeGraphQLQuery(
      data.endpoint,
      data.query,
      variables,
      headers
    );
    const historyItem: GraphQLQueryHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name: extractOperationNames(data.query)[0],
      query: data.query,
      variables: data.variables,
      headers: data.headers,
      isPinned: false,
    };
    updateState({
      response,
      isExecuting: false,
      history: [historyItem, ...data.history],
    });
  };

  const handleStartSubscription = async () => {
    if (!data.endpoint || !data.query) return;
    const wsEndpoint = data.endpoint
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    const connectionParams: Record<string, string> = {};
    data.headers
      .filter((h) => h.enabled)
      .forEach((h) => {
        connectionParams[h.key] = SensitiveDataManager.unmask(h.value);
      });
    try {
      const wsClient = new GraphQLWebSocketClient(wsEndpoint, connectionParams);
      wsClientRef.current = wsClient;
      await wsClient.connect();
      let variables = {};
      try {
        variables = parseVariables(data.variables);
      } catch (error) {
        updateState({
          subscriptionError:
            error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const subscriptionId = crypto.randomUUID();
      wsClient.subscribe(subscriptionId, data.query, variables, (message) => {
        const subscriptionMessage: SubscriptionMessage = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: message.type,
          data: message.payload?.data,
          errors: message.payload?.errors,
        };
        
        // *** THIS IS THE CORRECTED CALL ***
        // We need to build the new state object manually.
        // We use the `state` prop which is guaranteed to be the latest version.
        const newState: GraphQLTabletStateWrapper = {
            ...state,
            data: {
                ...state.data,
                subscriptionMessages: [
                    ...state.data.subscriptionMessages,
                    subscriptionMessage,
                ],
            },
        };
        onChange(newState);
      });
      updateState({
        isSubscriptionActive: true,
        subscriptionError: null,
        subscriptionMessages: [],
      });
    } catch (error) {
      updateState({
        subscriptionError:
          error instanceof Error ? error.message : String(error),
        isSubscriptionActive: false,
      });
    }
  };

  const handleStopSubscription = () => {
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }
    updateState({ isSubscriptionActive: false });
  };

  const handleRestoreHistory = (item: GraphQLQueryHistoryItem) => {
    updateState({
      query: item.query,
      variables: item.variables,
      headers: item.headers,
    });
    setShowHistory(false);
  };

  const handlePinHistory = (id: string, isPinned: boolean) => {
    const updatedHistory = data.history.map((item) =>
      item.id === id ? { ...item, isPinned } : item
    );
    updateState({ history: updatedHistory });
  };

  const handleDeleteHistory = (id: string) => {
    const updatedHistory = data.history.filter((item) => item.id !== id);
    updateState({ history: updatedHistory });
  };

  const handleFieldClick = (fieldName: string, typeName: string) => {
    const editor = queryEditorRef.current;
    if (!editor) {
      // Fallback in case editor is not ready
      const newQuery = data.query + `\n  ${fieldName}`;
      updateState({ query: newQuery });
      return;
    }

    const selection = editor.getSelection();
    if (!selection) return;

    const id = { major: 1, minor: 1 };
    const op = {
      identifier: id,
      range: selection,
      text: fieldName,
      forceMoveMarkers: true,
    };

    // Use executeEdits to insert the text. This correctly handles the undo/redo stack.
    editor.executeEdits("schema-explorer-click", [op]);

    // Return focus to the editor so the user can continue typing.
    editor.focus();
  };

  useEffect(() => {
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const filteredHistory = data.history.filter(
      (item) => item.isPinned || now - item.timestamp < ONE_HOUR
    );
    if (filteredHistory.length !== data.history.length) {
      updateState({ history: filteredHistory });
    }
  }, [data.history]);

  const operationType = detectOperationType(data.query);
  const isSubscription = operationType === "subscription";

    return (
      <div className="h-full bg-gray-900 flex flex-col">
        <div className="flex-none p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Network className="text-gray-400" size={24} />
              <h2 className="text-xl font-semibold text-gray-100">
                GraphQL Client
              </h2>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              <span>Browser CORS limitations may apply</span>
            </div>
          </div>
        </div>
        <UrlBar
          endpoint={data.endpoint}
          onEndpointChange={(endpoint) => updateState({ endpoint })}
          onLoadSchema={handleLoadSchema}
          isLoadingSchema={data.isLoadingSchema}
        />
        <div className="flex-1 flex overflow-hidden">
          <div
            className="border-r border-gray-700/50 overflow-hidden"
            style={{ width: `${data.leftPanelWidth}%` }}
          >
            <SchemaExplorer
              schema={data.schema}
              schemaError={data.schemaError}
              selectedType={data.selectedTypeInSchema}
              onTypeSelect={(typeName) =>
                updateState({ selectedTypeInSchema: typeName })
              }
              onFieldClick={handleFieldClick}
            />
          </div>
          <div
            className="border-r border-gray-700/50 flex flex-col overflow-hidden"
            style={{ width: `${data.middlePanelWidth}%` }}
          >
            <div className="flex-none flex items-center space-x-1 px-4 pt-3 border-b border-gray-700/50">
              <button
                onClick={() => updateState({ activeTab: "query" })}
                className={`px-4 py-2 text-sm rounded-t ${
                  data.activeTab === "query"
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                Query
              </button>
              <button
                onClick={() => updateState({ activeTab: "variables" })}
                className={`px-4 py-2 text-sm rounded-t ${
                  data.activeTab === "variables"
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                Variables
              </button>
              <button
                onClick={() => updateState({ activeTab: "headers" })}
                className={`px-4 py-2 text-sm rounded-t ${
                  data.activeTab === "headers"
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                Headers
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {data.activeTab === "query" && (
                <MonacoEditor
                  value={data.query}
                  onChange={(value) => updateState({ query: value })}
                  language="graphql"
                  onMount={(editor) => {
                    queryEditorRef.current = editor;
                  }}
                />
              )}
              {data.activeTab === "variables" && (
                <MonacoEditor
                  value={data.variables}
                  onChange={(value) => updateState({ variables: value })}
                  language="json"
                />
              )}
              {data.activeTab === "headers" && (
                <HeadersEditor
                  headers={data.headers}
                  onChange={(headers) => updateState({ headers })}
                />
              )}
            </div>
            <div className="flex-none p-3 border-t border-gray-700/50">
              {isSubscription ? (
                <div className="flex items-center space-x-2">
                  {data.isSubscriptionActive ? (
                    <button
                      onClick={handleStopSubscription}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <X size={16} />
                      <span>Stop Subscription</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleExecuteQuery}
                      disabled={data.isExecuting || !data.endpoint}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <RefreshCw size={16} />
                      <span>Start Subscription</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleExecuteQuery}
                  disabled={data.isExecuting || !data.endpoint}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {data.isExecuting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Execute {operationType || "Query"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {showHistory ? (
              <QueryHistory
                history={data.history}
                onRestore={handleRestoreHistory}
                onPin={handlePinHistory}
                onDelete={handleDeleteHistory}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <ResponseViewer
                response={data.response}
                error={data.error}
                isLoading={data.isExecuting}
                subscriptionMessages={data.subscriptionMessages}
                isSubscriptionActive={data.isSubscriptionActive}
                onShowHistory={() => setShowHistory(true)}
                historyCount={data.history.length}
              />
            )}
          </div>
        </div>
      </div>
    );
};
// *** REMOVED THE EXTRA CLOSING BRACE THAT WAS HERE ***


/**
 * Export the GraphQL Tablet object, correctly implementing the Tablet interface.
 */
export const GraphQLTablet: Tablet = {
  id: "graphql",
  label: "GraphQL Client",
  keywords: ["graphql", "api", "query", "mutation", "subscription", "schema"],

  createInitialState(): GraphQLTabletStateWrapper {
    return {
      type: "graphql",
      data: {
        endpoint: "",
        query: `# Welcome to GraphQL Client!\n#\n# Enter your GraphQL endpoint above and click "Load Schema"\n# to explore the API documentation.\n#\n# Example query:\nquery GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    email\n  }\n}`,
        variables: "{\n  \n}",
        headers: [
          {
            key: "Authorization",
            value: SensitiveDataManager.mask("Bearer your-token-here"),
            enabled: false,
          },
        ],
        response: null,
        isExecuting: false,
        error: null,
        schema: null,
        schemaError: null,
        isLoadingSchema: false,
        history: [],
        activeTab: "query",
        selectedOperation: null,
        isSubscriptionActive: false,
        subscriptionMessages: [],
        subscriptionError: null,
        leftPanelWidth: 25,
        middlePanelWidth: 40,
        showHistory: false,
        selectedTypeInSchema: null,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "graphql" && parsed.data) {
        if (parsed.data.headers && Array.isArray(parsed.data.headers)) {
          parsed.data.headers = parsed.data.headers.map((header: KeyValuePair) => {
            const sensitiveKeys = ["authorization", "x-api-key", "api-key", "token"];
            const shouldMask = sensitiveKeys.some((key) =>
              header.key.toLowerCase().includes(key)
            );
            if (shouldMask && typeof header.value === "string") {
              return {
                ...header,
                value: SensitiveDataManager.migrateField(header.value),
              };
            }
            return header;
          });
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize GraphQL state:", e);
    }
    return GraphQLTablet.createInitialState();
  },

  render(state: GraphQLTabletStateWrapper, onChange) {
    return <GraphQLTabletComponent state={state} onChange={onChange} />;
  },
};