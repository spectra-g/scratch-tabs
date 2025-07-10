import { useState } from "react";
import { Tablet, TabletState } from "../types";
import { Search, FileJson, Upload } from "lucide-react";
import { MappingList } from "./components/MappingList";
import { MappingEditor } from "./components/MappingEditor";
import { TestMappingModal } from "./components/TestMappingModal";
import { CodeGenerationModal } from "./components/CodeGenerationModal";
import { BatchTransformModal } from "./components/BatchTransformModal";
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

    const handleTestMappingFromList = (id: string) => {
      const mappingToListTest = state.data.mappings.find((m) => m.id === id);
      if (!mappingToListTest) return;

      onChange({
        ...state,
        data: {
          ...state.data,
          activeMappingId: id,
          isTestingMapping: true,
          testInput: mappingToListTest.sourceJson,
        },
      });
    };

    const handleGenerateCodeFromList = (id: string) => {
      const mappingToGenCode = state.data.mappings.find((m) => m.id === id);
      if (!mappingToGenCode) return;

      onChange({
        ...state,
        data: {
          ...state.data,
          activeMappingId: id,
          isGeneratingCode: true,
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
          },
        });
      }
    };

    const handleCloseBatchModal = () => {
      setShowBatchTransform(false);
    };

    const activeSavedMapping = state.data.activeMappingId
      ? state.data.mappings.find((m) => m.id === state.data.activeMappingId)
      : null;

    let mappingForTestModal: MappingConfig | null = null;
    if (state.data.isTestingMapping && state.data.activeMappingId) {
      mappingForTestModal =
        state.data.mappings.find((m) => m.id === state.data.activeMappingId) ||
        null;
    }

    let mappingForCodeModal: MappingConfig | null = null;
    if (state.data.isGeneratingCode && state.data.activeMappingId) {
      mappingForCodeModal =
        state.data.mappings.find((m) => m.id === state.data.activeMappingId) ||
        null;
    }

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

                {state.data.mappings.length > 0 && (
                  <button
                    onClick={() => setShowBatchTransform(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
                  >
                    <Upload size={16} />
                    <span>Batch Transform</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {state.data.isEditingMapping || state.data.isCreatingMapping ? (
            activeSavedMapping && (
              <MappingEditor
                mapping={activeSavedMapping}
                isNew={state.data.isCreatingMapping}
                onSave={handleSaveMapping}
                onCancel={handleCancelEdit}
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
              onTestMapping={handleTestMappingFromList}
              onGenerateCode={handleGenerateCodeFromList}
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

        {showBatchTransform && state.data.mappings.length > 0 && (
          <BatchTransformModal
            mapping={state.data.mappings[0]} // Default to first mapping, could add a selector
            onClose={handleCloseBatchModal}
            initialDirection={state.data.selectedDirection}
          />
        )}
      </div>
    );
  },
};
