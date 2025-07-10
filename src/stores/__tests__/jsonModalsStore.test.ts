import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useJsonModalsStore } from "../jsonModalsStore";
import { Tab } from "../../types";

describe("JsonModalsStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useJsonModalsStore.setState({
      modalState: { type: null },
    });
  });

  describe("Initial State", () => {
    it("should initialize with no modal open", () => {
      const state = useJsonModalsStore.getState();

      expect(state.modalState.type).toBeNull();
      expect(state.modalState.props).toBeUndefined();
    });
  });

  describe("Stringify Modal", () => {
    it("should open stringify modal with correct props", () => {
      const stringifiedContent = '{"test": "value"}';
      const mockAddTab = jest.fn();

      useJsonModalsStore
        .getState()
        .openStringifyModal(stringifiedContent, mockAddTab);

      const state = useJsonModalsStore.getState();
      expect(state.modalState.type).toBe("stringify");
      expect(state.modalState.props.content).toBe(stringifiedContent);
      expect(state.modalState.props.addTab).toBe(mockAddTab);
      expect(typeof state.modalState.props.onClose).toBe("function");
    });

    it("should provide working onClose function for stringify modal", () => {
      const mockAddTab = jest.fn();

      useJsonModalsStore.getState().openStringifyModal("test", mockAddTab);
      expect(useJsonModalsStore.getState().modalState.type).toBe("stringify");

      // Call onClose
      useJsonModalsStore.getState().modalState.props.onClose();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Code Generation Modal", () => {
    it("should open code generation modal with correct props", () => {
      const mockTabs = [
        {
          id: "tab1",
          title: "Tab 1",
          content: '{"key": "value"}',
          language: "json",
        },
        {
          id: "tab2",
          title: "Tab 2",
          content: '{"another": "object"}',
          language: "json",
        },
      ];
      const mockAddTab = jest.fn();

      useJsonModalsStore
        .getState()
        .openCodeGenerationModal(mockTabs, mockAddTab);

      const state = useJsonModalsStore.getState();
      expect(state.modalState.type).toBe("codeGeneration");
      expect(state.modalState.props.tabs).toBe(mockTabs);
      expect(state.modalState.props.addTab).toBe(mockAddTab);
      expect(typeof state.modalState.props.onClose).toBe("function");
    });

    it("should provide working onClose function for code generation modal", () => {
      const mockTabs = [
        { id: "tab1", title: "Tab 1", content: "{}", language: "json" },
      ];
      const mockAddTab = jest.fn();

      useJsonModalsStore
        .getState()
        .openCodeGenerationModal(mockTabs, mockAddTab);
      expect(useJsonModalsStore.getState().modalState.type).toBe(
        "codeGeneration",
      );

      // Call onClose
      useJsonModalsStore.getState().modalState.props.onClose();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Tree View Modal", () => {
    it("should open tree view modal with correct props", () => {
      const mockJson = {
        name: "test",
        values: [1, 2, 3],
        nested: { prop: "value" },
      };

      useJsonModalsStore.getState().openTreeViewModal(mockJson);

      const state = useJsonModalsStore.getState();
      expect(state.modalState.type).toBe("treeView");
      expect(state.modalState.props.json).toBe(mockJson);
      expect(typeof state.modalState.props.onClose).toBe("function");
    });

    it("should provide working onClose function for tree view modal", () => {
      const mockJson = { test: "value" };

      useJsonModalsStore.getState().openTreeViewModal(mockJson);
      expect(useJsonModalsStore.getState().modalState.type).toBe("treeView");

      // Call onClose
      useJsonModalsStore.getState().modalState.props.onClose();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Schema Validation Modal", () => {
    it("should open schema validation modal with correct props", () => {
      const mockJson = {
        schema: { type: "object", properties: { name: { type: "string" } } },
        data: { name: "test" },
      };

      useJsonModalsStore.getState().openSchemaValidationModal(mockJson);

      const state = useJsonModalsStore.getState();
      expect(state.modalState.type).toBe("schemaValidation");
      expect(state.modalState.props.json).toBe(mockJson);
      expect(typeof state.modalState.props.onClose).toBe("function");
    });

    it("should provide working onClose function for schema validation modal", () => {
      const mockJson = { schema: {}, data: {} };

      useJsonModalsStore.getState().openSchemaValidationModal(mockJson);
      expect(useJsonModalsStore.getState().modalState.type).toBe(
        "schemaValidation",
      );

      // Call onClose
      useJsonModalsStore.getState().modalState.props.onClose();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Structure Comparison Modal", () => {
    it("should open structure comparison modal with correct props", () => {
      const sourceJson = '{"name": "test", "array": [1, 2, 3]}';

      useJsonModalsStore.getState().openStructureComparisonModal(sourceJson);

      const state = useJsonModalsStore.getState();
      expect(state.modalState.type).toBe("structureComparison");
      expect(state.modalState.props.sourceJson).toBe(sourceJson);
      expect(typeof state.modalState.props.onClose).toBe("function");
    });

    it("should provide working onClose function for structure comparison modal", () => {
      const sourceJson = '{"test": "value"}';

      useJsonModalsStore.getState().openStructureComparisonModal(sourceJson);
      expect(useJsonModalsStore.getState().modalState.type).toBe(
        "structureComparison",
      );

      // Call onClose
      useJsonModalsStore.getState().modalState.props.onClose();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Close Modal", () => {
    it("should close any open modal", () => {
      // Open a modal first
      useJsonModalsStore.getState().openTreeViewModal({ test: "value" });
      expect(useJsonModalsStore.getState().modalState.type).toBe("treeView");

      // Close modal
      useJsonModalsStore.getState().closeModal();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });

    it("should handle closing when no modal is open", () => {
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();

      // Close modal when none is open
      useJsonModalsStore.getState().closeModal();
      expect(useJsonModalsStore.getState().modalState.type).toBeNull();
    });
  });

  describe("Modal State Transitions", () => {
    it("should handle opening different modals in sequence", () => {
      const mockAddTab = jest.fn();
      const mockJson = { test: "value" };

      // Open stringify modal
      useJsonModalsStore.getState().openStringifyModal("test", mockAddTab);
      expect(useJsonModalsStore.getState().modalState.type).toBe("stringify");

      // Open tree view modal (should replace stringify)
      useJsonModalsStore.getState().openTreeViewModal(mockJson);
      expect(useJsonModalsStore.getState().modalState.type).toBe("treeView");

      // Open schema validation modal (should replace tree view)
      useJsonModalsStore.getState().openSchemaValidationModal(mockJson);
      expect(useJsonModalsStore.getState().modalState.type).toBe(
        "schemaValidation",
      );
    });

    it("should overwrite modal props when opening new modal of same type", () => {
      const firstJson = { first: "value" };
      const secondJson = { second: "value" };

      // Open first tree view modal
      useJsonModalsStore.getState().openTreeViewModal(firstJson);
      expect(useJsonModalsStore.getState().modalState.props.json).toBe(
        firstJson,
      );

      // Open second tree view modal
      useJsonModalsStore.getState().openTreeViewModal(secondJson);
      expect(useJsonModalsStore.getState().modalState.props.json).toBe(
        secondJson,
      );
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = useJsonModalsStore.getState();
      const store2 = useJsonModalsStore.getState();

      expect(store1.openStringifyModal).toBe(store2.openStringifyModal);
      expect(store1.openCodeGenerationModal).toBe(
        store2.openCodeGenerationModal,
      );
      expect(store1.openTreeViewModal).toBe(store2.openTreeViewModal);
      expect(store1.openSchemaValidationModal).toBe(
        store2.openSchemaValidationModal,
      );
      expect(store1.openStructureComparisonModal).toBe(
        store2.openStructureComparisonModal,
      );
      expect(store1.closeModal).toBe(store2.closeModal);
    });
  });

  describe("Props Immutability", () => {
    it("should not mutate original objects passed as props", () => {
      const originalJson = { test: "value", nested: { prop: "nested" } };
      const originalJsonCopy = JSON.parse(JSON.stringify(originalJson));

      useJsonModalsStore.getState().openTreeViewModal(originalJson);

      // Original should not be modified
      expect(originalJson).toEqual(originalJsonCopy);

      // Store should reference the same object
      const storedJson = useJsonModalsStore.getState().modalState.props.json;
      expect(storedJson).toBe(originalJson);
    });
  });

  describe("Store Subscription", () => {
    it("should notify subscribers when modal state changes", () => {
      let callbackInvoked = false;
      let capturedState: any = null;

      const unsubscribe = useJsonModalsStore.subscribe((state) => {
        callbackInvoked = true;
        capturedState = state;
      });

      // Open a modal
      useJsonModalsStore.getState().openTreeViewModal({ test: "value" });

      // Clean up
      unsubscribe();

      expect(callbackInvoked).toBe(true);
      expect(capturedState.modalState.type).toBe("treeView");
    });
  });
});
