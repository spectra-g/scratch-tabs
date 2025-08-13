import { renderHook, act } from "@testing-library/react";
import { useIniData } from "../hooks/useIniData";

describe("useIniData", () => {
  const sampleIni = `# Database configuration
[database]
host = localhost
port = 5432
user = admin
password = secret123

# Application settings
[app]
name = My Application
version = 1.0.0
debug = false`;

  const mockOnContentChange = jest.fn();

  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  describe("INI Parsing", () => {
    it("should parse INI with sections correctly", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.sections).toHaveLength(2);
      expect(result.current.sections[0].name).toBe("database");
      expect(result.current.sections[1].name).toBe("app");
      expect(result.current.sections[0].lines).toHaveLength(4); // 4 key-value pairs
    });

    it("should handle global section (keys before first section)", () => {
      const globalIni = `global_key = global_value
another_global = value

[section1]
key1 = value1`;

      const { result } = renderHook(() =>
        useIniData(globalIni, mockOnContentChange),
      );

      expect(result.current.sections).toHaveLength(2);
      expect(result.current.sections[0].name).toBe(""); // Global section
      expect(result.current.sections[0].lines).toHaveLength(2);
      expect(result.current.sections[1].name).toBe("section1");
    });

    it("should preserve comments", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];
      expect(databaseSection.comment).toBe("Database configuration");
    });

    it("should handle empty INI", () => {
      const { result } = renderHook(() => useIniData("", mockOnContentChange));

      expect(result.current.sections).toHaveLength(0);
      expect(result.current.state).toHaveLength(0);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe("Section Management", () => {
    it("should add new sections", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      act(() => {
        result.current.addSection("new_section");
      });

      expect(result.current.sections).toHaveLength(3);
      expect(result.current.sections[2].name).toBe("new_section");
      expect(result.current.selectedSectionId).toBe(result.current.sections[2].id);
    });

    it("should delete sections", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const sectionToDelete = result.current.sections[0];

      act(() => {
        result.current.deleteSection(sectionToDelete.id);
      });

      expect(result.current.sections).toHaveLength(1);
      expect(result.current.sections[0].name).toBe("app");
    });

    it("should rename sections", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const sectionToRename = result.current.sections[0];

      act(() => {
        result.current.renameSection(sectionToRename.id, "database_prod");
      });

      expect(result.current.sections[0].name).toBe("database_prod");
    });

    it("should duplicate sections", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const sectionToDuplicate = result.current.sections[0];

      act(() => {
        result.current.duplicateSection(sectionToDuplicate.id, "database_copy");
      });

      expect(result.current.sections).toHaveLength(3);
      expect(result.current.sections[1].name).toBe("database_copy");
      expect(result.current.sections[1].lines).toHaveLength(4); // Same number of keys
    });
  });

  describe("Key-Value Management", () => {
    it("should add key-value pairs", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];

      act(() => {
        result.current.addKeyValue(databaseSection.id, "timeout", "30", "Connection timeout");
      });

      const updatedSection = result.current.sections[0];
      expect(updatedSection.lines).toHaveLength(5);
      expect(updatedSection.lines[4].key).toBe("timeout");
      expect(updatedSection.lines[4].value).toBe("30");
      expect(updatedSection.lines[4].comment).toBe("Connection timeout");
    });

    it("should update key-value pairs", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];
      const hostLine = databaseSection.lines.find(line => line.key === "host");

      act(() => {
        result.current.updateKeyValue(
          databaseSection.id,
          hostLine!.id,
          "host",
          "production.example.com",
          "Production server"
        );
      });

      const updatedSection = result.current.sections[0];
      const updatedLine = updatedSection.lines.find(line => line.key === "host");
      expect(updatedLine!.value).toBe("production.example.com");
      expect(updatedLine!.comment).toBe("Production server");
    });

    it("should delete key-value pairs", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];
      const hostLine = databaseSection.lines.find(line => line.key === "host");

      act(() => {
        result.current.deleteKeyValue(databaseSection.id, hostLine!.id);
      });

      const updatedSection = result.current.sections[0];
      expect(updatedSection.lines).toHaveLength(3);
      expect(updatedSection.lines.find(line => line.key === "host")).toBeUndefined();
    });
  });

  describe("Transformation Functions", () => {
    it("should sort keys in section", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];

      act(() => {
        result.current.sortKeysInSection(databaseSection.id);
      });

      const updatedSection = result.current.sections[0];
      const keys = updatedSection.lines.filter(line => line.type === 'PAIR').map(line => line.key);
      expect(keys).toEqual(["host", "password", "port", "user"]);
    });

    it("should sort all sections", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      act(() => {
        result.current.sortAllSections();
      });

      expect(result.current.sections[0].name).toBe("app");
      expect(result.current.sections[1].name).toBe("database");
    });

    it("should strip all comments", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      act(() => {
        result.current.stripAllComments();
      });

      // Check that section comments are removed
      expect(result.current.sections[0].comment).toBeUndefined();
      expect(result.current.sections[1].comment).toBeUndefined();

      // Check that inline comments are removed
      result.current.sections.forEach(section => {
        section.lines.forEach(line => {
          if (line.type === 'PAIR') {
            expect(line.comment).toBeUndefined();
          }
        });
      });
    });

    it("should normalize spacing", () => {
      const messyIni = `[section]
key1=value1
key2   =   value2
key3= value3`;

      const { result } = renderHook(() =>
        useIniData(messyIni, mockOnContentChange),
      );

      act(() => {
        result.current.normalizeSpacing();
      });

      // All key-value pairs should have consistent spacing
      const section = result.current.sections[0];
      section.lines.forEach(line => {
        if (line.type === 'PAIR') {
          expect(line.key).not.toMatch(/^\s|\s$/); // No leading/trailing spaces
          expect(line.value).not.toMatch(/^\s|\s$/); // No leading/trailing spaces
        }
      });
    });
  });

  describe("Converter Functions", () => {
    it("should convert to JSON", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const jsonOutput = result.current.convertToJson();
      const parsed = JSON.parse(jsonOutput);

      expect(parsed).toHaveProperty("database");
      expect(parsed.database).toHaveProperty("host", "localhost");
      expect(parsed.database).toHaveProperty("port", "5432");
      expect(parsed).toHaveProperty("app");
      expect(parsed.app).toHaveProperty("name", "My Application");
    });

    it("should convert to YAML", () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const yamlOutput = result.current.convertToYaml();
      expect(yamlOutput).toContain("database:");
      expect(yamlOutput).toContain("  host: localhost");
      expect(yamlOutput).toContain("app:");
      expect(yamlOutput).toContain("  name: My Application");
    });
  });

  describe("Validation", () => {
    it("should detect duplicate sections", () => {
      const duplicateSectionsIni = `[database]
host = localhost

[database]
port = 5432`;

      const { result } = renderHook(() =>
        useIniData(duplicateSectionsIni, mockOnContentChange),
      );

      expect(result.current.validationIssues).toHaveLength(1);
      expect(result.current.validationIssues[0].type).toBe("error");
      expect(result.current.validationIssues[0].message).toContain("Duplicate section");
      expect(result.current.isValid).toBe(false);
    });

    it("should detect duplicate keys within section", () => {
      const duplicateKeysIni = `[section]
key1 = value1
key2 = value2
key1 = duplicate_value`;

      const { result } = renderHook(() =>
        useIniData(duplicateKeysIni, mockOnContentChange),
      );

      expect(result.current.validationIssues).toHaveLength(1);
      expect(result.current.validationIssues[0].type).toBe("error");
      expect(result.current.validationIssues[0].message).toContain("Duplicate key");
      expect(result.current.isValid).toBe(false);
    });

    it("should detect empty values", () => {
      const emptyValueIni = `[section]
key1 = 
key2 = value2`;

      const { result } = renderHook(() =>
        useIniData(emptyValueIni, mockOnContentChange),
      );

      expect(result.current.validationIssues).toHaveLength(1);
      expect(result.current.validationIssues[0].type).toBe("warning");
      expect(result.current.validationIssues[0].message).toContain("Empty value");
    });
  });

  describe("Content Synchronization", () => {
    it("should call onContentChange when data is modified", async () => {
      const { result } = renderHook(() =>
        useIniData(sampleIni, mockOnContentChange),
      );

      const databaseSection = result.current.sections[0];

      act(() => {
        result.current.addKeyValue(databaseSection.id, "timeout", "30");
      });

      // Wait for debounced call
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const calledWith = mockOnContentChange.mock.calls[0][0];
      expect(calledWith).toContain("timeout = 30");
    });
  });
});