import React, { useState } from "react";
import {
  Globe,
  User,
  Key,
  Hash,
  FileText,
  Search,
  Anchor,
  Link,
} from "lucide-react";
import { UrlComponents, UrlParserState, UrlWarning } from "./types";
import { UrlInput } from "./components/UrlInput";
import { ComponentEditor } from "./components/ComponentEditor";
import { QueryParamsEditor } from "./components/QueryParamsEditor";
import { WarningsPanel } from "./components/WarningsPanel";
import { ComparisonView } from "./components/ComparisonView";
import { ToolbarButtons } from "./components/ToolbarButtons";
import { HistoryPanel } from "./components/HistoryPanel";
import { SuspiciousUrlDemo } from "./components/SuspiciousUrlDemo";
import { getSuspiciousUrlExamples } from "./utils/urlUtils";

interface UrlParserUIProps {
  url: string;
  components: UrlComponents;
  warnings: UrlWarning[];
  history: string[];
  viewMode: "decoded" | "encoded";
  comparisonMode: boolean;
  comparisonResults?: Record<string, UrlComponents>;
  onUpdateUrl: (url: string) => void;
  onUpdateComponent: (value: string, component: keyof UrlComponents) => void;
  onUpdateQueryParams: (params: Record<string, string>) => void;
  onToggleEncoding: () => void;
  onToggleComparison: () => void;
  onClearUrl: () => void;
  onPaste: () => void;
}

export const UrlParserUI: React.FC<UrlParserUIProps> = ({
  url,
  components,
  warnings,
  history,
  viewMode,
  comparisonMode,
  comparisonResults,
  onUpdateUrl,
  onUpdateComponent,
  onUpdateQueryParams,
  onToggleEncoding,
  onToggleComparison,
  onClearUrl,
  onPaste,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSuspiciousDemo, setShowSuspiciousDemo] = useState(false);

  const isEncoded = viewMode === "encoded";
  const hasWarnings = warnings.length > 0;

  const handleLoadSuspiciousExample = () => {
    setShowSuspiciousDemo(true);
  };

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Link size={20} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-100">URL Parser</h2>
          </div>

          <ToolbarButtons
            url={url}
            hasWarnings={hasWarnings}
            isEncoded={isEncoded}
            showComparison={comparisonMode}
            onClearUrl={onClearUrl}
            onToggleEncoding={onToggleEncoding}
            onToggleComparison={onToggleComparison}
            onShowHistory={() => setShowHistory(true)}
            onLoadSuspiciousExample={handleLoadSuspiciousExample}
          />
        </div>

        <UrlInput
          url={url}
          warnings={warnings}
          onUrlChange={onUpdateUrl}
          onPaste={onPaste}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div>
            <ComponentEditor
              label="Scheme (Protocol)"
              icon={<Globe size={16} className="text-blue-400" />}
              value={components.scheme}
              component="scheme"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
            />

            <ComponentEditor
              label="Username"
              icon={<User size={16} className="text-green-400" />}
              value={components.username}
              component="username"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
              onToggleEncoding={onToggleEncoding}
              sensitive={true}
            />

            <ComponentEditor
              label="Password"
              icon={<Key size={16} className="text-red-400" />}
              value={components.password}
              component="password"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
              onToggleEncoding={onToggleEncoding}
              sensitive={true}
            />

            <ComponentEditor
              label="Host"
              icon={<Globe size={16} className="text-purple-400" />}
              value={components.host}
              component="host"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
            />

            <ComponentEditor
              label="Port"
              icon={<Hash size={16} className="text-yellow-400" />}
              value={components.port}
              component="port"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
            />
          </div>

          {/* Right column */}
          <div>
            <ComponentEditor
              label="Path"
              icon={<FileText size={16} className="text-blue-400" />}
              value={components.path}
              component="path"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
              onToggleEncoding={onToggleEncoding}
            />

            <ComponentEditor
              label="Query String"
              icon={<Search size={16} className="text-green-400" />}
              value={components.query}
              component="query"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
              onToggleEncoding={onToggleEncoding}
            />

            <ComponentEditor
              label="Fragment"
              icon={<Anchor size={16} className="text-orange-400" />}
              value={components.fragment}
              component="fragment"
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateComponent}
              onToggleEncoding={onToggleEncoding}
            />

            <QueryParamsEditor
              params={components.queryParams}
              warnings={warnings}
              isEncoded={isEncoded}
              onChange={onUpdateQueryParams}
            />
          </div>
        </div>

        {/* Warnings panel */}
        <WarningsPanel warnings={warnings} />

        {/* Comparison view */}
        {comparisonMode && (
          <ComparisonView
            url={url}
            comparisonResults={comparisonResults || {}}
          />
        )}
      </div>

      {/* History panel */}
      {showHistory && (
        <HistoryPanel
          history={history}
          onSelectUrl={onUpdateUrl}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Suspicious URL demo */}
      {showSuspiciousDemo && (
        <SuspiciousUrlDemo
          onSelectUrl={onUpdateUrl}
          onClose={() => setShowSuspiciousDemo(false)}
        />
      )}
    </div>
  );
};
