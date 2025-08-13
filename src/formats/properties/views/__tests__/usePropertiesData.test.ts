import { renderHook, act } from "@testing-library/react";
import { usePropertiesData } from "../hooks/usePropertiesData";
import { PropertyPair } from "../types";

describe("usePropertiesData", () => {
  const sampleProperties = `# Application Configuration
app.name = My Application
app.version = 1.0.0
app.debug = false

# Database settings
database.host = localhost
database.port = 5432
database.user = admin
database.password = secret

# Empty line above
server.port = 8080`;

  const mockOnContentChange = jest.fn();

  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  describe("Parsing", () => {
    it("should parse properties content correctly", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.state.length).toBeGreaterThan(0);

      // Check that we have the expected pairs
      const pairs = result.current.state.filter(line => line.type === 'PAIR');
      expect(pairs.length).toBe(8);
    });

    it("should build tree structure correctly", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      const tree = result.current.treeData;
      expect(tree.length).toBe(1); // Root node
      
      const rootNode = tree[0];
      expect(rootNode.children.length).toBe(3); // app, database, server
      
      const appNode = rootNode.children.find(child => child.name === 'app');
      expect(appNode).toBeDefined();
      expect(appNode!.children.length).toBe(3); // name, version, debug
    });

    it("should handle empty content", () => {
      const { result } = renderHook(() =>
        usePropertiesData("", mockOnContentChange),
      );

      expect(result.current.state).toHaveLength(0);
      expect(result.current.treeData[0].children).toHaveLength(0);
    });
  });

  describe("Validation", () => {
    it("should detect duplicate keys", () => {
      const duplicateContent = `app.name = First
app.version = 1.0
app.name = Second
database.host = localhost`;

      const { result } = renderHook(() =>
        usePropertiesData(duplicateContent, mockOnContentChange),
      );

      expect(result.current.validation.duplicateKeys).toContain("app.name");
    });

    it("should detect empty values", () => {
      const emptyValueContent = `app.name = My App
app.version = 
database.host = localhost
database.port = `;

      const { result } = renderHook(() =>
        usePropertiesData(emptyValueContent, mockOnContentChange),
      );

      expect(result.current.validation.emptyValues).toContain("app.version");
      expect(result.current.validation.emptyValues).toContain("database.port");
    });

    it("should detect invalid key formats", () => {
      const invalidKeyContent = `app.name = Valid
app version = Invalid Space
app@name = Invalid Symbol
database.host = Valid`;

      const { result } = renderHook(() =>
        usePropertiesData(invalidKeyContent, mockOnContentChange),
      );

      expect(result.current.validation.invalidKeys).toContain("app version");
      expect(result.current.validation.invalidKeys).toContain("app@name");
    });
  });

  describe("Data Manipulation", () => {
    it("should update pair values", async () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      const pairs = result.current.state.filter(line => line.type === 'PAIR') as PropertyPair[];
      const firstPair = pairs[0];

      act(() => {
        result.current.updatePair(firstPair.id, firstPair.key, "Updated Value", "Updated comment");
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const updatedContent = mockOnContentChange.mock.calls[0][0];
      expect(updatedContent).toContain("Updated Value");
    });

    it("should add new pairs", async () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      act(() => {
        result.current.addPair("new.key", "new value", "new comment");
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const updatedContent = mockOnContentChange.mock.calls[0][0];
      expect(updatedContent).toContain("new.key = new value");
    });

    it("should delete pairs", async () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      const pairs = result.current.state.filter(line => line.type === 'PAIR');
      const firstPair = pairs[0];

      act(() => {
        result.current.deletePair(firstPair.id);
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
    });
  });

  describe("Transformations", () => {
    it("should sort keys alphabetically", async () => {
      const unsortedContent = `zebra = value
alpha = value
beta = value`;

      const { result } = renderHook(() =>
        usePropertiesData(unsortedContent, mockOnContentChange),
      );

      act(() => {
        result.current.sortKeysAlphabetically();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const sortedContent = mockOnContentChange.mock.calls[0][0];
      const lines = sortedContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      expect(lines[0]).toContain("alpha");
      expect(lines[1]).toContain("beta");
      expect(lines[2]).toContain("zebra");
    });

    it("should group by prefix", async () => {
      const ungroupedContent = `app.name = App
database.host = localhost
app.version = 1.0
database.port = 5432`;

      const { result } = renderHook(() =>
        usePropertiesData(ungroupedContent, mockOnContentChange),
      );

      act(() => {
        result.current.groupByPrefix();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const groupedContent = mockOnContentChange.mock.calls[0][0];
      expect(groupedContent).toContain("# app configuration");
      expect(groupedContent).toContain("# database configuration");
    });

    it("should strip all comments", async () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      act(() => {
        result.current.stripAllComments();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const strippedContent = mockOnContentChange.mock.calls[0][0];
      expect(strippedContent).not.toContain("#");
    });
  });

  describe("Converters", () => {
    it("should convert to nested JSON", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      const jsonContent = result.current.convertToNestedJson();
      const parsed = JSON.parse(jsonContent);

      expect(parsed.app).toBeDefined();
      expect(parsed.app.name).toBe("My Application");
      expect(parsed.database).toBeDefined();
      expect(parsed.database.host).toBe("localhost");
    });

    it("should convert to YAML", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      const yamlContent = result.current.convertToYaml();
      expect(yamlContent).toContain("app:");
      expect(yamlContent).toContain("  name: My Application");
      expect(yamlContent).toContain("database:");
      expect(yamlContent).toContain("  host: localhost");
    });
  });

  describe("Tree Navigation", () => {
    it("should filter pairs based on selected node", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      // Select the 'app' node
      act(() => {
        result.current.setSelectedNode('app');
      });

      const filteredPairs = result.current.filteredPairs;
      expect(filteredPairs.every(pair => pair.key.startsWith('app.'))).toBe(true);
    });

    it("should show all pairs when root is selected", () => {
      const { result } = renderHook(() =>
        usePropertiesData(sampleProperties, mockOnContentChange),
      );

      act(() => {
        result.current.setSelectedNode('root');
      });

      const allPairs = result.current.state.filter(line => line.type === 'PAIR');
      expect(result.current.filteredPairs.length).toBe(allPairs.length);
    });
  });
});