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

    it("should preserve comment sections with their related properties, sort within sections, and preserve single blank lines", async () => {
      const contentWithBlankLines = `# Java-style Properties Configuration
# Application settings
app.name = My Application
app.version = 1.0.3
app.environment = production

# Database configuration using dot notation
database.host = localhost
database.port = 5432
database.username = admin
database.password = secret
database.pool.min = 5
database.pool.max = 20

# Server settings
server.port = 8080
server.timeout = 30000
server.ssl.enabled = false

# Features and toggles
feature.authentication = true
feature.logging = enabled
feature.debug.mode = false

# File paths and resources
log.file.path = /var/log/application.log
config.dir = /etc/myapp/
temp.directory = /tmp/myapp/


`;

      const { result } = renderHook(() =>
        usePropertiesData(contentWithBlankLines, mockOnContentChange),
      );

      act(() => {
        result.current.sortKeysAlphabetically();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const sortedContent = mockOnContentChange.mock.calls[0][0];
      
      // Should preserve ALL comments
      expect(sortedContent).toContain("# Java-style Properties Configuration");
      expect(sortedContent).toContain("# Application settings");
      expect(sortedContent).toContain("# Database configuration using dot notation");
      expect(sortedContent).toContain("# Server settings");
      expect(sortedContent).toContain("# Features and toggles");
      expect(sortedContent).toContain("# File paths and resources");
      
      const lines = sortedContent.split('\n');
      
      // Should preserve single blank lines (one per section separator)
      const blankLineCount = lines.filter(line => line.trim() === '').length;
      expect(blankLineCount).toBeGreaterThan(0); // Should have some blank lines for separation
      expect(blankLineCount).toBeLessThan(7); // Original had ~6+ blank lines, should be reduced
      
      // Should not have consecutive blank lines
      let consecutiveBlankCount = 0;
      let maxConsecutiveBlanks = 0;
      
      for (const line of lines) {
        if (line.trim() === '') {
          consecutiveBlankCount++;
          maxConsecutiveBlanks = Math.max(maxConsecutiveBlanks, consecutiveBlankCount);
        } else {
          consecutiveBlankCount = 0;
        }
      }
      
      expect(maxConsecutiveBlanks).toBeLessThanOrEqual(1); // No more than 1 consecutive blank line
      
      // Comments should be kept with their related properties in sections
      // Check that database comments come before database properties
      const dbCommentIndex = lines.findIndex(line => line.includes("# Database configuration"));
      const dbHostIndex = lines.findIndex(line => line.includes("database.host"));
      expect(dbCommentIndex).toBeLessThan(dbHostIndex);
      
      // Check that properties within each section are sorted
      const appLines = lines.slice(
        lines.findIndex(line => line.includes("# Application settings")),
        lines.findIndex(line => line.includes("# Database configuration"))
      ).filter(line => line.includes('=') && !line.startsWith('#'));
      
      if (appLines.length > 1) {
        expect(appLines[0]).toContain("app.environment");
        expect(appLines[1]).toContain("app.name");
        expect(appLines[2]).toContain("app.version");
      }
    });

    it("should preserve comments and sort properties when comments exist in middle", async () => {
      const contentWithMiddleComments = `database.host = localhost
app.name = My Application

# Some comment in middle
app.version = 1.0.3

server.port = 8080`;

      const { result } = renderHook(() =>
        usePropertiesData(contentWithMiddleComments, mockOnContentChange),
      );

      act(() => {
        result.current.sortKeysAlphabetically();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const sortedContent = mockOnContentChange.mock.calls[0][0];
      
      // Should preserve the comment
      expect(sortedContent).toContain("# Some comment in middle");
      
      // Should preserve single blank lines for section separation
      const lines = sortedContent.split('\n');
      const blankLineCount = lines.filter(line => line.trim() === '').length;
      expect(blankLineCount).toBeGreaterThanOrEqual(1); // Should have at least one blank line
      
      // The sorting creates sections: properties before comment, then comment with following properties
      // So the structure should be: first section properties (sorted), then comment + related properties
      const commentIndex = lines.findIndex(line => line.includes("# Some comment in middle"));
      const appVersionIndex = lines.findIndex(line => line.includes("app.version"));
      expect(commentIndex).toBeLessThan(appVersionIndex); // Comment should come before its related property
    });

    it("should collapse multiple consecutive blank lines to single blank lines", async () => {
      const contentWithMultipleBlankLines = `# Header comment
app.name = My App


# Another section with multiple blanks
database.host = localhost



# Final section
server.port = 8080`;

      const { result } = renderHook(() =>
        usePropertiesData(contentWithMultipleBlankLines, mockOnContentChange),
      );

      act(() => {
        result.current.sortKeysAlphabetically();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const sortedContent = mockOnContentChange.mock.calls[0][0];
      
      const lines = sortedContent.split('\n');
      
      // Should collapse multiple blank lines to single ones
      const blankLineCount = lines.filter(line => line.trim() === '').length;
      expect(blankLineCount).toBeLessThanOrEqual(2); // Should have reduced from 6 original blank lines
      
      // Should not have consecutive blank lines
      let consecutiveBlankCount = 0;
      let maxConsecutiveBlanks = 0;
      
      for (const line of lines) {
        if (line.trim() === '') {
          consecutiveBlankCount++;
          maxConsecutiveBlanks = Math.max(maxConsecutiveBlanks, consecutiveBlankCount);
        } else {
          consecutiveBlankCount = 0;
        }
      }
      
      expect(maxConsecutiveBlanks).toBeLessThanOrEqual(1); // No more than 1 consecutive blank line
    });

    it("should handle sorting when file starts with properties (no header comments)", async () => {
      const contentNoHeader = `zebra.config = value
alpha.setting = value
beta.option = value`;

      const { result } = renderHook(() =>
        usePropertiesData(contentNoHeader, mockOnContentChange),
      );

      act(() => {
        result.current.sortKeysAlphabetically();
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const sortedContent = mockOnContentChange.mock.calls[0][0];
      
      // Should not have any blank lines
      const lines = sortedContent.split('\n');
      const blankLineCount = lines.filter(line => line.trim() === '').length;
      expect(blankLineCount).toBe(0);
      
      // Properties should be sorted alphabetically
      expect(lines[0]).toContain("alpha.setting");
      expect(lines[1]).toContain("beta.option");
      expect(lines[2]).toContain("zebra.config");
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