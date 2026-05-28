import React, { useMemo, useState } from "react";
import { AlertTriangle, KeyRound, Network, Shapes } from "lucide-react";
import { SmartViewProps } from "../../../views/registry";
import { OpenApiOperation } from "../utils/openApiTypes";
import { OpenApiDiagnosticsView } from "./components/OpenApiDiagnosticsView";
import { OpenApiEndpointExplorer } from "./components/OpenApiEndpointExplorer";
import { OpenApiOverview } from "./components/OpenApiOverview";
import { OpenApiSchemaExplorer } from "./components/OpenApiSchemaExplorer";
import { OpenApiSecurityView } from "./components/OpenApiSecurityView";
import { OpenApiFilters, useOpenApiData } from "./hooks/useOpenApiData";

type OpenApiTab = "endpoints" | "schemas" | "security" | "diagnostics";

const initialFilters: OpenApiFilters = {
  query: "",
  method: "all",
  tag: "all",
  auth: "all",
  deprecated: "all",
};

export const OpenApiSmartView: React.FC<SmartViewProps> = ({ content, tabId, side }) => {
  const [activeTab, setActiveTab] = useState<OpenApiTab>("endpoints");
  const [filters, setFilters] = useState<OpenApiFilters>(initialFilters);
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | null>(null);
  const { model, filteredOperations, methodCounts } = useOpenApiData(content, filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => model.operations.find((operation) => operation.id === selectedId) ?? filteredOperations[0] ?? null,
    [filteredOperations, model.operations, selectedId],
  );

  const handleSelect = (operation: OpenApiOperation) => setSelectedId(operation.id);
  const handleOpenSchema = (schemaName: string) => {
    setSelectedSchemaName(schemaName);
    setActiveTab("schemas");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface" data-testid="openapi-explorer">
      <OpenApiOverview model={model} methodCounts={methodCounts} />
      <div className="flex border-b border-base bg-surface px-2">
        <TabButton active={activeTab === "endpoints"} onClick={() => setActiveTab("endpoints")} icon={<Network size={14} />} label="Endpoints" testId="openapi-tab-endpoints" />
        <TabButton active={activeTab === "schemas"} onClick={() => setActiveTab("schemas")} icon={<Shapes size={14} />} label="Schemas" testId="openapi-tab-schemas" />
        <TabButton active={activeTab === "security"} onClick={() => setActiveTab("security")} icon={<KeyRound size={14} />} label="Security" testId="openapi-tab-security" />
        <TabButton active={activeTab === "diagnostics"} onClick={() => setActiveTab("diagnostics")} icon={<AlertTriangle size={14} />} label="Diagnostics" testId="openapi-tab-diagnostics" />
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === "endpoints" && (
          <OpenApiEndpointExplorer
            model={model}
            operations={filteredOperations}
            selected={selected}
            filters={filters}
            onSelect={handleSelect}
            onFiltersChange={setFilters}
            sourceTabId={tabId}
            side={side}
            onOpenSchema={handleOpenSchema}
          />
        )}
        {activeTab === "schemas" && <OpenApiSchemaExplorer schemas={model.schemas} selectedSchemaName={selectedSchemaName} />}
        {activeTab === "security" && <OpenApiSecurityView model={model} />}
        {activeTab === "diagnostics" && <OpenApiDiagnosticsView diagnostics={model.diagnostics} />}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; testId: string }> = ({ active, onClick, icon, label, testId }) => (
  <button data-testid={testId} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs ${active ? "border-primary text-main" : "border-transparent text-secondary hover:text-main"}`} onClick={onClick}>
    {icon}
    {label}
  </button>
);
