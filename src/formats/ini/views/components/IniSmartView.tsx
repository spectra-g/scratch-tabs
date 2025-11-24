import React, { useState, useCallback } from "react";
import { SmartViewProps } from "../../../../views/registry";
import { useIniData } from "../hooks/useIniData";
import { IniTreeView } from "./IniTreeView";
import { IniEditor } from "./IniEditor";
import { IniToolbox } from "./IniToolbox";
import { IniValidationPanel } from "./IniValidationPanel";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";
import { IniTreeNode } from "../types";
import { Plus } from "../../../../components/Icons";

export const IniSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive: _isActive,
  side,
}) => {
  const { addBackgroundTab } = useRootStore();
  const [showValidation, setShowValidation] = useState(false);

  const iniData = useIniData(content, onContentChange);
  const {
    sections,
    selectedSectionId,
    setSelectedSectionId,
    treeNodes,
    loading,
    error,
    validationIssues,
    isValid,
    addSection,
    addKeyValue,
    updateKeyValue,
    deleteKeyValue,
    sortKeysInSection,
    sortAllSections,
    stripAllComments,
    normalizeSpacing,
    trimWhitespace,
    ensureFinalNewline,
    removeFinalNewline,
    convertToJson,
    convertToYaml,
  } = iniData;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const findNodeInTree = useCallback((nodes: IniTreeNode[], nodeId: string): IniTreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children?.length) {
        const found = findNodeInTree(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleSetSelectedNode = useCallback((nodeId: string | null) => {
    const normalizedNodeId = (!nodeId || nodeId === 'root') ? 'root' : nodeId;
    setSelectedNodeId(normalizedNodeId);

    if (normalizedNodeId === 'root') {
      setSelectedSectionId(null);
    } else {
      const selectedNode = findNodeInTree(treeNodes, normalizedNodeId);
      if (selectedNode) {
        if (selectedNode.type === 'section') {
          setSelectedSectionId(selectedNode.id);
        } else if (selectedNode.type === 'key') {
          setSelectedSectionId(selectedNode.sectionId || null);
        }
      }
    }
  }, [treeNodes, setSelectedSectionId, findNodeInTree]);

  const getFilteredData = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'root') {
      return sections;
    }

    const selectedNode = findNodeInTree(treeNodes, selectedNodeId);
    if (!selectedNode) return sections;

    if (selectedNode.type === 'section') {
      return sections.filter(s => s.id === selectedNode.id);
    } else if (selectedNode.type === 'key') {
      const parentSection = sections.find(s => s.id === selectedNode.sectionId);
      if (parentSection) {
        const filteredSection = {
          ...parentSection,
          lines: parentSection.lines.filter(line => line.id === selectedNode.id || line.type === 'COMMENT')
        };
        return [filteredSection];
      }
      return [];
    }

    return sections;
  }, [selectedNodeId, sections, treeNodes, findNodeInTree]);

  const filteredSections = getFilteredData();

  const handleAddSection = useCallback(() => {
    if (newSectionName.trim()) {
      addSection(newSectionName.trim());
      setNewSectionName("");
      setShowAddSectionForm(false);
    }
  }, [newSectionName, addSection]);

  const handleConvertToJson = useCallback(() => {
    const jsonContent = convertToJson();
    const tab = createTab({
      title: "INI as JSON",
      content: jsonContent,
      language: "json",
    });
    addBackgroundTab(tab);
  }, [convertToJson, addBackgroundTab]);

  const handleConvertToYaml = useCallback(() => {
    const yamlContent = convertToYaml();
    const tab = createTab({
      title: "INI as YAML",
      content: yamlContent,
      language: "yaml",
    });
    addBackgroundTab(tab);
  }, [convertToYaml, addBackgroundTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas">
        <div className="text-secondary">Loading INI data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas">
        <div className="text-danger">Error: {error}</div>
      </div>
    );
  }

  const hasValidationIssues = validationIssues.length > 0;

  const totalKeyCount = sections.reduce((sum, s) => sum + s.lines.filter(l => l.type === 'PAIR').length, 0);

  return (
    <div
      className="flex h-full bg-canvas text-main"
      data-testid="ini-smart-view"
      key={`ini-view-${tabId}-${side}`}
    >
      {/* Left Panel: Tree Navigation */}
      <div className="w-80 border-r border-base flex flex-col">
        <div className="flex-none p-3 border-b border-base">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-main">INI Structure</h3>
            {(!selectedNodeId || selectedNodeId === 'root') && (
              <button
                onClick={() => setShowAddSectionForm(!showAddSectionForm)}
                className="p-1 hover:bg-element-hover rounded transition-colors text-secondary hover:text-main"
                title="Add new section"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="text-xs text-secondary">
            {totalKeyCount} properties
            {selectedNodeId && selectedNodeId !== 'root' && (
              <span className="ml-2 text-info">
                (filtered by {(() => {
                  const node = findNodeInTree(treeNodes, selectedNodeId);
                  return node ? node.name : selectedNodeId;
                })()})
              </span>
            )}
          </div>

          {/* Add Section Form */}
          {showAddSectionForm && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name"
                className="w-full bg-element border border-base rounded px-2 py-1 text-sm text-main focus:outline-none focus:border-focus"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSection();
                  } else if (e.key === 'Escape') {
                    setShowAddSectionForm(false);
                    setNewSectionName("");
                  }
                }}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleAddSection}
                  disabled={!newSectionName.trim()}
                  className="px-2 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSectionForm(false);
                    setNewSectionName("");
                  }}
                  className="px-2 py-1 bg-element text-main rounded text-xs hover:bg-element-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <IniTreeView
            treeNodes={treeNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSetSelectedNode}
            validationIssues={validationIssues}
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
              {validationIssues.length} Issues
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbox */}
        <div className="flex-none border-b border-base">
          <IniToolbox
            selectedSectionId={selectedSectionId}
            validationIssues={validationIssues}
            isValid={isValid}
            onShowValidation={() => setShowValidation(!showValidation)}
            onSortKeysInSection={selectedSectionId ? () => sortKeysInSection(selectedSectionId) : undefined}
            onSortAllSections={sortAllSections}
            onStripAllComments={stripAllComments}
            onNormalizeSpacing={normalizeSpacing}
            onTrimWhitespace={trimWhitespace}
            onEnsureFinalNewline={ensureFinalNewline}
            onRemoveFinalNewline={removeFinalNewline}
            onConvertToJson={handleConvertToJson}
            onConvertToYaml={handleConvertToYaml}
            sectionCount={sections.length}
            totalKeyCount={totalKeyCount}
          />
        </div>

        {/* Validation Panel */}
        {showValidation && hasValidationIssues && (
          <div className="flex-none border-b border-base">
            <IniValidationPanel
              issues={validationIssues}
              onClose={() => setShowValidation(false)}
              onSelectSection={setSelectedSectionId}
            />
          </div>
        )}

        {/* INI Editor */}
        <div className="flex-1 overflow-hidden">
          <IniEditor
            selectedSection={selectedSectionId ? filteredSections.find(s => s.id === selectedSectionId) || null : null}
            selectedSectionId={selectedSectionId}
            sections={filteredSections}
            onAddKeyValue={addKeyValue}
            onUpdateKeyValue={updateKeyValue}
            onDeleteKeyValue={deleteKeyValue}
            validationIssues={validationIssues}
            onAddSection={addSection}
          />
        </div>
      </div>
    </div>
  );
};