import React, { useState, useCallback } from "react";
import { SmartViewProps } from "../../../../views/registry";
import { usePropertiesData } from "../hooks/usePropertiesData";
import { PropertiesTreeView } from "./PropertiesTreeView";
import { PropertiesEditor } from "./PropertiesEditor";
import { PropertiesToolbox } from "./PropertiesToolbox";
import { PropertiesValidationPanel } from "./PropertiesValidationPanel";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";

export const PropertiesSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive: _isActive,
  side,
}) => {
  const { addBackgroundTab } = useRootStore();
  const [showValidation, setShowValidation] = useState(false);

  const propertiesData = usePropertiesData(content, onContentChange);
  const {
    treeData,
    validation,
    loading,
    error,
    selectedNodeId,
    filteredPairs,
    setSelectedNode,
    updatePair,
    addPair,
    deletePair,
    addComment,
    sortKeysAlphabetically,
    groupByPrefix,
    stripAllComments,
    normalizeSpacing,
    ensureFinalNewline,
    removeFinalNewline,
    convertToNestedJson,
    convertToYaml,
  } = propertiesData;

  // Handle conversions that create new tabs
  const handleConvertToJson = useCallback(() => {
    const jsonContent = convertToNestedJson();
    const tab = createTab({
      title: "Properties as JSON",
      content: jsonContent,
      language: "json",
    });
    addBackgroundTab(tab);
  }, [convertToNestedJson, addBackgroundTab]);

  const handleConvertToYaml = useCallback(() => {
    const yamlContent = convertToYaml();
    const tab = createTab({
      title: "Properties as YAML",
      content: yamlContent,
      language: "yaml",
    });
    addBackgroundTab(tab);
  }, [convertToYaml, addBackgroundTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-secondary">Loading properties...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-danger">Error: {error}</div>
      </div>
    );
  }

  const hasValidationIssues =
    validation.duplicateKeys.length > 0 ||
    validation.emptyValues.length > 0 ||
    validation.invalidKeys.length > 0;

  return (
    <div
      className="flex h-full bg-surface text-main"
      data-testid="properties-smart-view"
      key={`properties-view-${tabId}-${side}`}
    >
      {/* Left Panel: Tree Navigation */}
      <div className="w-80 border-r border-base flex flex-col">
        <div className="flex-none p-3 border-b border-base bg-surface-secondary">
          <h3 className="text-sm font-medium text-main mb-2">Property Hierarchy</h3>
          <div className="text-xs text-secondary">
            {filteredPairs.length} properties
            {selectedNodeId && selectedNodeId !== 'root' && (
              <span className="ml-2 text-primary">
                (filtered by {selectedNodeId})
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <PropertiesTreeView
            treeData={treeData}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNode}
            validation={validation}
          />
        </div>

        {/* Validation Panel Toggle */}
        {hasValidationIssues && (
          <div className="flex-none border-t border-base p-2">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`w-full text-xs px-2 py-1 rounded transition-colors ${showValidation
                ? "bg-warning/20 text-warning"
                : "bg-element text-main hover:bg-element-hover"
                }`}
            >
              {validation.duplicateKeys.length + validation.emptyValues.length + validation.invalidKeys.length} Issues
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbox */}
        <div className="flex-none border-b border-base">
          <PropertiesToolbox
            onSortKeys={sortKeysAlphabetically}
            onGroupByPrefix={groupByPrefix}
            onStripComments={stripAllComments}
            onNormalizeSpacing={normalizeSpacing}
            onEnsureFinalNewline={ensureFinalNewline}
            onRemoveFinalNewline={removeFinalNewline}
            onConvertToJson={handleConvertToJson}
            onConvertToYaml={handleConvertToYaml}
            validation={validation}
            onToggleValidation={() => setShowValidation(!showValidation)}
            showValidation={showValidation}
          />
        </div>

        {/* Validation Panel */}
        {showValidation && hasValidationIssues && (
          <div className="flex-none border-b border-base">
            <PropertiesValidationPanel
              validation={validation}
              onClose={() => setShowValidation(false)}
            />
          </div>
        )}

        {/* Properties Editor */}
        <div className="flex-1 overflow-hidden">
          <PropertiesEditor
            pairs={filteredPairs}
            selectedNodeId={selectedNodeId}
            validation={validation}
            onUpdatePair={updatePair}
            onAddPair={addPair}
            onDeletePair={deletePair}
            onAddComment={addComment}
          />
        </div>
      </div>
    </div>
  );
};