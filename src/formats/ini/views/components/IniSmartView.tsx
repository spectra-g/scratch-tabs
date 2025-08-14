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
    deleteSection,
    duplicateSection,
    renameSection,
    reorderSections,
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

  // Track selected node (can be root, section, or individual key)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  
  // Add section form state
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Handle node selection and update the underlying section selection
  const handleSetSelectedNode = useCallback((nodeId: string | null) => {
    // Always ensure we set to 'root' for consistency when viewing all sections
    const normalizedNodeId = (!nodeId || nodeId === 'root') ? 'root' : nodeId;
    setSelectedNodeId(normalizedNodeId);
    
    if (normalizedNodeId === 'root') {
      // Root node selected - show all sections
      setSelectedSectionId(null);
    } else {
      // Find the node in the tree
      const findNode = (nodes: IniTreeNode[]): IniTreeNode | null => {
        for (const node of nodes) {
          if (node.id === nodeId) return node;
          if (node.children && node.children.length > 0) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const selectedNode = findNode(treeNodes);
      if (selectedNode) {
        if (selectedNode.type === 'section') {
          // Section node selected
          setSelectedSectionId(selectedNode.id);
        } else if (selectedNode.type === 'key') {
          // Key node selected - select its parent section
          setSelectedSectionId(selectedNode.sectionId);
        }
      }
    }
  }, [treeNodes, setSelectedSectionId]);

  // Get filtered data based on selection
  const getFilteredData = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'root') {
      // Show all sections
      return sections;
    }
    
    // Find the selected node
    const findNode = (nodes: IniTreeNode[]): IniTreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedNodeId) return node;
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const selectedNode = findNode(treeNodes);
    if (!selectedNode) return sections;
    
    if (selectedNode.type === 'section') {
      // Show only this section
      return sections.filter(s => s.id === selectedNode.id);
    } else if (selectedNode.type === 'key') {
      // Show only the section containing this key, but filter the lines to show only this specific key
      const parentSection = sections.find(s => s.id === selectedNode.sectionId);
      if (parentSection) {
        // Create a filtered version of the section with only the selected key
        const filteredSection = {
          ...parentSection,
          lines: parentSection.lines.filter(line => line.id === selectedNode.id || line.type === 'COMMENT')
        };
        return [filteredSection];
      }
      return [];
    }
    
    return sections;
  }, [selectedNodeId, sections, treeNodes]);

  const filteredSections = getFilteredData();

  // Handle add section
  const handleAddSection = useCallback(() => {
    if (newSectionName.trim()) {
      addSection(newSectionName.trim());
      setNewSectionName("");
      setShowAddSectionForm(false);
    }
  }, [newSectionName, addSection]);

  // Handle converter actions
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
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">Loading INI data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const hasValidationIssues = validationIssues.length > 0;
  
  const totalKeyCount = sections.reduce((sum, s) => sum + s.lines.filter(l => l.type === 'PAIR').length, 0);

  return (
    <div 
      className="flex h-full bg-gray-900 text-gray-200" 
      data-testid="ini-smart-view"
      key={`ini-view-${tabId}-${side}`}
    >
      {/* Left Panel: Tree Navigation */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="flex-none p-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">INI Structure</h3>
            {/* Show Add Section button when viewing All Sections or when no specific node is selected */}
            {(!selectedNodeId || selectedNodeId === 'root') && (
              <button
                onClick={() => setShowAddSectionForm(!showAddSectionForm)}
                className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
                title="Add new section"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {totalKeyCount} properties
            {selectedNodeId && selectedNodeId !== 'root' && (
              <span className="ml-2 text-blue-400">
                (filtered by {(() => {
                  const findNode = (nodes: IniTreeNode[]): IniTreeNode | null => {
                    for (const node of nodes) {
                      if (node.id === selectedNodeId) return node;
                      if (node.children && node.children.length > 0) {
                        const found = findNode(node.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  const node = findNode(treeNodes);
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
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
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
                  className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSectionForm(false);
                    setNewSectionName("");
                  }}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
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
          <div className="flex-none border-t border-gray-700 p-2">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`w-full text-xs px-2 py-1 rounded transition-colors ${
                showValidation
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
        <div className="flex-none border-b border-gray-700">
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
            showValidation={showValidation}
            onToggleValidation={() => setShowValidation(!showValidation)}
          />
        </div>

        {/* Validation Panel */}
        {showValidation && hasValidationIssues && (
          <div className="flex-none border-b border-gray-700">
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