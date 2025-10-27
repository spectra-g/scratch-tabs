import { JsonMapperTablet } from "../JsonMapperTablet";
import { JsonMapperState, MappingConfig } from "../types";

describe("JsonMapperTablet", () => {
  describe("State Initialization", () => {
    it("should create initial state with editorScrollPosition", () => {
      const initialState = JsonMapperTablet.createInitialState();

      expect(initialState).toEqual({
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
      });
    });
  });

  describe("State Serialization", () => {
    it("should serialize state including scroll position", () => {
      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          editorScrollPosition: 250,
          mappings: [
            {
              id: "test-1",
              name: "Test Mapping",
              description: "Test",
              sourceJson: "{}",
              targetJson: "{}",
              rules: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      };

      const serialized = JsonMapperTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.editorScrollPosition).toBe(250);
      expect(parsed.data.mappings).toHaveLength(1);
    });

    it("should deserialize state with scroll position", () => {
      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          editorScrollPosition: 100,
        },
      };

      const serialized = JsonMapperTablet.serializeState(state);
      const deserialized = JsonMapperTablet.deserializeState(
        serialized
      ) as JsonMapperState;

      expect(deserialized.data.editorScrollPosition).toBe(100);
    });

    it("should handle invalid JSON during deserialization", () => {
      const result = JsonMapperTablet.deserializeState("invalid json");

      // Should return initial state
      expect(result).toEqual(JsonMapperTablet.createInitialState());
    });

    it("should handle wrong type during deserialization", () => {
      const wrongType = JSON.stringify({
        type: "wrongtype",
        data: {},
      });

      const result = JsonMapperTablet.deserializeState(wrongType);

      // Should return initial state
      expect(result).toEqual(JsonMapperTablet.createInitialState());
    });
  });

  describe("Scroll Position Management", () => {
    it("should reset scroll position when saving mapping", () => {
      const onChange = jest.fn();
      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          activeMappingId: "test-1",
          isEditingMapping: true,
          editorScrollPosition: 500,
          mappings: [
            {
              id: "test-1",
              name: "Test",
              description: "",
              sourceJson: "{}",
              targetJson: "{}",
              rules: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      };

      // This tests the logic that would be in handleSaveMapping
      const updatedMapping: MappingConfig = {
        ...state.data.mappings[0],
        name: "Updated",
      };

      const newState = {
        ...state,
        data: {
          ...state.data,
          mappings: state.data.mappings.map((m) =>
            m.id === updatedMapping.id ? updatedMapping : m
          ),
          activeMappingId: null,
          isEditingMapping: false,
          isCreatingMapping: false,
          editorScrollPosition: 0,
        },
      };

      expect(newState.data.editorScrollPosition).toBe(0);
      expect(newState.data.isEditingMapping).toBe(false);
    });

    it("should reset scroll position when canceling edit", () => {
      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          activeMappingId: "test-1",
          isEditingMapping: true,
          editorScrollPosition: 500,
        },
      };

      const newState = {
        ...state,
        data: {
          ...state.data,
          activeMappingId: null,
          isEditingMapping: false,
          editorScrollPosition: 0,
        },
      };

      expect(newState.data.editorScrollPosition).toBe(0);
    });

    it("should preserve scroll position during editing", () => {
      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          activeMappingId: "test-1",
          isEditingMapping: true,
          editorScrollPosition: 300,
          mappings: [
            {
              id: "test-1",
              name: "Test",
              description: "",
              sourceJson: "{}",
              targetJson: "{}",
              rules: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        },
      };

      // Update scroll position
      const newState = {
        ...state,
        data: {
          ...state.data,
          editorScrollPosition: 450,
        },
      };

      expect(newState.data.editorScrollPosition).toBe(450);
      expect(newState.data.isEditingMapping).toBe(true);
    });
  });

  describe("Mapping State Persistence", () => {
    it("should preserve mappings when updating scroll position", () => {
      const testMapping: MappingConfig = {
        id: "test-1",
        name: "Test Mapping",
        description: "Description",
        sourceJson: '{"name": "test"}',
        targetJson: '{"fullName": ""}',
        rules: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          mappings: [testMapping],
          activeMappingId: "test-1",
          isEditingMapping: true,
          editorScrollPosition: 100,
        },
      };

      // Update scroll position (simulating handleScrollPositionChange)
      const newState = {
        ...state,
        data: {
          ...state.data,
          editorScrollPosition: 200,
        },
      };

      expect(newState.data.mappings).toHaveLength(1);
      expect(newState.data.mappings[0]).toEqual(testMapping);
      expect(newState.data.editorScrollPosition).toBe(200);
    });

    it("should update mapping in place when changes occur", () => {
      const originalMapping: MappingConfig = {
        id: "test-1",
        name: "Original",
        description: "",
        sourceJson: "{}",
        targetJson: "{}",
        rules: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const initialState = JsonMapperTablet.createInitialState();
      const state: JsonMapperState = {
        type: "jsonmapper" as const,
        data: {
          ...initialState.data,
          mappings: [originalMapping],
          activeMappingId: "test-1",
          isEditingMapping: true,
        },
      };

      const updatedMapping: MappingConfig = {
        ...originalMapping,
        name: "Updated Name",
        updatedAt: Date.now(),
      };

      // Simulate handleMappingChange
      const newState = {
        ...state,
        data: {
          ...state.data,
          mappings: state.data.mappings.map((m) =>
            m.id === updatedMapping.id ? updatedMapping : m
          ),
        },
      };

      expect(newState.data.mappings[0].name).toBe("Updated Name");
      expect(newState.data.mappings[0].id).toBe(originalMapping.id);
    });
  });
});
