import { useState } from "react";
import { Tablet, TabletState } from "../types";
import { Search, FileJson, Info } from "lucide-react";
import { MappingList } from "./components/MappingList";
import { MappingEditor } from "./components/MappingEditor";
import { TestMappingModal } from "./components/TestMappingModal";
import { CodeGenerationModal } from "./components/CodeGenerationModal";
import { BatchTransformModal } from "./components/BatchTransformModal";
import { HelpGuide } from "./components/HelpGuide";
import { JsonMapperState, MappingConfig } from "./types";

export const JsonMapperTablet: Tablet = {
  id: "jsonmapper",
  label: "JSON Mapper",
  keywords: ["json", "mapper", "transform", "convert", "mapping"],

  createInitialState(): JsonMapperState {
    return {
      type: "jsonmapper",
      data: {
        mappings: [],
        activeMappingId: null,
        isEditingMapping: false,
        isCreatingMapping: false,
        isTestingMapping: false,
        isGeneratingCode: false,
        testInput: "",
        testOutput: "",
        testError: null,
        selectedLanguage: "javascript",
        selectedDirection: "sourceToTarget",
        generatedCode: "",
        searchQuery: "",
        editorScrollPosition: 0,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "jsonmapper" && parsed.data) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize JSON mapper state:", e);
    }
    return this.createInitialState();
  },

  render(state: JsonMapperState, onChange) {
    const [showBatchTransform, setShowBatchTransform] = useState(false);
    const [currentBatchMapping, setCurrentBatchMapping] = useState<MappingConfig | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const handleSearchChange = (query: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          searchQuery: query,
        },
      });
    };

    const handleCreateMapping = () => {
      const newMapping: MappingConfig = {
        id: crypto.randomUUID(),
        name: "New Mapping",
        description: "",
        sourceJson: "",
        targetJson: "",
        rules: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onChange({
        ...state,
        data: {
          ...state.data,
          activeMappingId: newMapping.id,
          isCreatingMapping: true,
          mappings: [...state.data.mappings, newMapping],
        },
      });
    };

    const handleEditMapping = (id: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeMappingId: id,
          isEditingMapping: true,
        },
      });
    };

    const handleDeleteMapping = (id: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          mappings: state.data.mappings.filter((m) => m.id !== id),
        },
      });
    };

    const handleDuplicateMapping = (id: string) => {
      const mapping = state.data.mappings.find((m) => m.id === id);
      if (!mapping) return;

      const newMapping: MappingConfig = {
        ...mapping,
        id: crypto.randomUUID(),
        name: `${mapping.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onChange({
        ...state,
        data: {
          ...state.data,
          mappings: [...state.data.mappings, newMapping],
        },
      });
    };

    const handleBatchTransformFromList = (id: string) => {
      const mappingToBatch = state.data.mappings.find((m) => m.id === id);
      if (!mappingToBatch) return;

      setCurrentBatchMapping(mappingToBatch);
      setShowBatchTransform(true);
    };

    const handleMappingChange = (updatedMapping: MappingConfig) => {
      // Continuously update the mapping in state as user makes changes
      // Only update if the mapping actually changed
      const currentMapping = state.data.mappings.find(m => m.id === updatedMapping.id);
      if (!currentMapping) return;

      // Deep comparison to prevent unnecessary updates
      const hasChanged =
        currentMapping.name !== updatedMapping.name ||
        currentMapping.description !== updatedMapping.description ||
        currentMapping.sourceJson !== updatedMapping.sourceJson ||
        currentMapping.targetJson !== updatedMapping.targetJson ||
        currentMapping.rules.length !== updatedMapping.rules.length;

      if (!hasChanged) return;

      onChange({
        ...state,
        data: {
          ...state.data,
          mappings: state.data.mappings.map((m) =>
            m.id === updatedMapping.id ? updatedMapping : m,
          ),
        },
      });
    };

    const handleScrollPositionChange = (position: number) => {
      // Only update if position actually changed
      if (state.data.editorScrollPosition === position) return;

      onChange({
        ...state,
        data: {
          ...state.data,
          editorScrollPosition: position,
        },
      });
    };

    const handleSaveMapping = (updatedMapping: MappingConfig) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          mappings: state.data.mappings.map((m) =>
            m.id === updatedMapping.id ? updatedMapping : m,
          ),
          activeMappingId: null,
          isEditingMapping: false,
          isCreatingMapping: false,
          editorScrollPosition: 0,
        },
      });
    };

    const handleCancelEdit = () => {
      // If creating a new mapping, remove it
      if (state.data.isCreatingMapping) {
        onChange({
          ...state,
          data: {
            ...state.data,
            mappings: state.data.mappings.filter(
              (m) => m.id !== state.data.activeMappingId,
            ),
            activeMappingId: null,
            isCreatingMapping: false,
            editorScrollPosition: 0,
          },
        });
      } else {
        // Just cancel editing
        onChange({
          ...state,
          data: {
            ...state.data,
            activeMappingId: null,
            isEditingMapping: false,
            editorScrollPosition: 0,
          },
        });
      }
    };

    const handleCloseBatchModal = () => {
      setShowBatchTransform(false);
      setCurrentBatchMapping(null);
    };

    const activeSavedMapping = state.data.activeMappingId
      ? state.data.mappings.find((m) => m.id === state.data.activeMappingId)
      : null;

    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileJson className="text-gray-400" size={24} />
              <h2 className="text-xl font-semibold text-gray-100">
                JSON Mapper
              </h2>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
                title="Show help guide"
              >
                <Info size={16} />
              </button>
            </div>

            {!state.data.isEditingMapping && !state.data.isCreatingMapping && (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={state.data.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search mappings..."
                    className="bg-gray-800/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors w-64"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Guide */}
        {showHelp && (
          <div className="flex-none p-4 border-b border-gray-700/50">
            <HelpGuide 
              isExpanded={showHelp}
              onToggle={(expanded) => setShowHelp(expanded)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {state.data.isEditingMapping || state.data.isCreatingMapping ? (
            activeSavedMapping && (
              <MappingEditor
                mapping={activeSavedMapping}
                isNew={state.data.isCreatingMapping}
                onSave={handleSaveMapping}
                onCancel={handleCancelEdit}
                onMappingChange={handleMappingChange}
                scrollPosition={state.data.editorScrollPosition}
                onScrollPositionChange={handleScrollPositionChange}
                onTest={(mappingInProgress) => {
                  onChange({
                    ...state,
                    data: {
                      ...state.data,
                      activeMappingId: mappingInProgress.id,
                      isTestingMapping: true,
                      testInput: mappingInProgress.sourceJson,
                      _transientMappingForModal: mappingInProgress,
                    },
                  });
                }}
                onGenerateCode={(mappingInProgress) => {
                  onChange({
                    ...state,
                    data: {
                      ...state.data,
                      activeMappingId: mappingInProgress.id,
                      isGeneratingCode: true,
                      _transientMappingForModal: mappingInProgress,
                    },
                  });
                }}
                onBatchTransform={(mappingInProgress) => {
                  setCurrentBatchMapping(mappingInProgress);
                  setShowBatchTransform(true);
                }}
              />
            )
          ) : (
            <MappingList
              mappings={state.data.mappings}
              searchQuery={state.data.searchQuery}
              onCreateMapping={handleCreateMapping}
              onEditMapping={handleEditMapping}
              onDeleteMapping={handleDeleteMapping}
              onDuplicateMapping={handleDuplicateMapping}
              onBatchTransform={handleBatchTransformFromList}
            />
          )}
        </div>

        {/* Modals */}
        {state.data.isTestingMapping &&
          (state.data._transientMappingForModal || activeSavedMapping) && (
            <TestMappingModal
              mapping={
                state.data._transientMappingForModal || activeSavedMapping!
              }
              initialInput={
                state.data._transientMappingForModal?.sourceJson ||
                state.data.testInput
              }
              onClose={() => {
                const nextData = {
                  ...state.data,
                  isTestingMapping: false,
                  testInput: "",
                  testOutput: "",
                  testError: null,
                };
                delete nextData._transientMappingForModal;
                onChange({ ...state, data: nextData });
              }}
            />
          )}

        {state.data.isGeneratingCode &&
          (state.data._transientMappingForModal || activeSavedMapping) && (
            <CodeGenerationModal
              mapping={
                state.data._transientMappingForModal || activeSavedMapping!
              }
              onClose={() => {
                const nextData = {
                  ...state.data,
                  isGeneratingCode: false,
                  generatedCode: "",
                };
                delete nextData._transientMappingForModal;
                onChange({ ...state, data: nextData });
              }}
              initialLanguage={state.data.selectedLanguage}
              initialDirection={state.data.selectedDirection}
            />
          )}

        {showBatchTransform && currentBatchMapping && (
          <BatchTransformModal
            mapping={currentBatchMapping}
            onClose={handleCloseBatchModal}
            initialDirection={state.data.selectedDirection}
          />
        )}
      </div>
    );
  },
};
