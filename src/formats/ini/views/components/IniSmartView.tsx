import React, { useState, useCallback } from "react";
import { SmartViewProps } from "../../../../views/registry";
import { useIniData } from "../hooks/useIniData";
import { IniTreeView } from "./IniTreeView";
import { IniEditor } from "./IniEditor";
import { IniToolbox } from "./IniToolbox";
import { IniValidationPanel } from "./IniValidationPanel";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";

export const IniSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId: _tabId,
}) => {
  const { addBackgroundTab } = useRootStore();
  const [showValidationPanel, setShowValidationPanel] = useState(false);

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

  // Get the currently selected section
  const selectedSection = selectedSectionId 
    ? sections.find(s => s.id === selectedSectionId)
    : null;

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

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200" data-testid="ini-smart-view">
      {/* Toolbox */}
      <IniToolbox
        selectedSectionId={selectedSectionId}
        validationIssues={validationIssues}
        isValid={isValid}
        onShowValidation={() => setShowValidationPanel(!showValidationPanel)}
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
        totalKeyCount={sections.reduce((sum, s) => sum + s.lines.filter(l => l.type === 'PAIR').length, 0)}
      />

      {/* Validation Panel */}
      {showValidationPanel && validationIssues.length > 0 && (
        <IniValidationPanel
          issues={validationIssues}
          onClose={() => setShowValidationPanel(false)}
          onSelectSection={setSelectedSectionId}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Tree Navigation */}
        <div className="w-80 border-r border-gray-700 flex flex-col">
          <IniTreeView
            treeNodes={treeNodes}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onAddSection={addSection}
            onDeleteSection={deleteSection}
            onDuplicateSection={duplicateSection}
            onRenameSection={renameSection}
            onReorderSections={reorderSections}
            validationIssues={validationIssues}
          />
        </div>

        {/* Right Panel - Key-Value Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <IniEditor
            selectedSection={selectedSection}
            selectedSectionId={selectedSectionId}
            sections={sections}
            onAddKeyValue={addKeyValue}
            onUpdateKeyValue={updateKeyValue}
            onDeleteKeyValue={deleteKeyValue}
            validationIssues={validationIssues}
          />
        </div>
      </div>
    </div>
  );
};