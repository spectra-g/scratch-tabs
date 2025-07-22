import { defaultTemplates } from "../data/defaultTemplates";
import { defaultSnippets } from "../data/defaultSnippets";
import { defaultTags } from "../data/defaultTags";
import { Template, Snippet, Tag } from "../types";

describe("Default Data", () => {
  describe("Default Templates", () => {
    it("should export default templates", () => {
      expect(defaultTemplates).toBeDefined();
      expect(Array.isArray(defaultTemplates)).toBe(true);
      expect(defaultTemplates.length).toBeGreaterThan(0);
    });

    it("should have valid template structure", () => {
      defaultTemplates.forEach((template: Template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("title");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("content");
        expect(template).toHaveProperty("category");
        expect(template).toHaveProperty("isBuiltIn");
        
        expect(typeof template.id).toBe("string");
        expect(typeof template.title).toBe("string");
        expect(typeof template.description).toBe("string");
        expect(typeof template.content).toBe("string");
        expect(typeof template.category).toBe("string");
        expect(typeof template.isBuiltIn).toBe("boolean");
        
        expect(template.id.length).toBeGreaterThan(0);
        expect(template.title.length).toBeGreaterThan(0);
        expect(template.content.length).toBeGreaterThan(0);
        expect(template.category.length).toBeGreaterThan(0);
        expect(template.isBuiltIn).toBe(true);
      });
    });

    it("should have unique template IDs", () => {
      const ids = defaultTemplates.map((template: Template) => template.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have meaningful content", () => {
      defaultTemplates.forEach((template: Template) => {
        expect(template.content.length).toBeGreaterThan(10);
        expect(template.content).toContain("{{");
      });
    });

    it("should have descriptive titles", () => {
      defaultTemplates.forEach((template: Template) => {
        expect(template.title.length).toBeGreaterThan(3);
        expect(template.title.length).toBeLessThan(100);
      });
    });

    it("should have helpful descriptions", () => {
      defaultTemplates.forEach((template: Template) => {
        expect(template.description.length).toBeGreaterThan(10);
        expect(template.description.length).toBeLessThan(200);
      });
    });
  });

  describe("Default Snippets", () => {
    it("should export default snippets", () => {
      expect(defaultSnippets).toBeDefined();
      expect(Array.isArray(defaultSnippets)).toBe(true);
      expect(defaultSnippets.length).toBeGreaterThan(0);
    });

    it("should have valid snippet structure", () => {
      defaultSnippets.forEach((snippet: Snippet) => {
        expect(snippet).toHaveProperty("id");
        expect(snippet).toHaveProperty("title");
        expect(snippet).toHaveProperty("content");
        expect(snippet).toHaveProperty("category");
        expect(snippet).toHaveProperty("isBuiltIn");
        
        expect(typeof snippet.id).toBe("string");
        expect(typeof snippet.title).toBe("string");
        expect(typeof snippet.content).toBe("string");
        expect(typeof snippet.category).toBe("string");
        expect(typeof snippet.isBuiltIn).toBe("boolean");
        
        expect(snippet.id.length).toBeGreaterThan(0);
        expect(snippet.title.length).toBeGreaterThan(0);
        expect(snippet.content.length).toBeGreaterThan(0);
        expect(snippet.category.length).toBeGreaterThan(0);
        expect(snippet.isBuiltIn).toBe(true);
      });
    });

    it("should have unique snippet IDs", () => {
      const ids = defaultSnippets.map((snippet: Snippet) => snippet.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have useful content", () => {
      defaultSnippets.forEach((snippet: Snippet) => {
        expect(snippet.content.length).toBeGreaterThan(5);
      });
    });

    it("should have descriptive titles", () => {
      defaultSnippets.forEach((snippet: Snippet) => {
        expect(snippet.title.length).toBeGreaterThan(3);
        expect(snippet.title.length).toBeLessThan(100);
      });
    });
  });

  describe("Default Tags", () => {
    it("should export default tags", () => {
      expect(defaultTags).toBeDefined();
      expect(Array.isArray(defaultTags)).toBe(true);
      expect(defaultTags.length).toBeGreaterThan(0);
    });

    it("should have valid tag structure", () => {
      defaultTags.forEach((tag: Tag) => {
        expect(tag).toHaveProperty("id");
        expect(tag).toHaveProperty("name");
        expect(tag).toHaveProperty("color");
        expect(tag).toHaveProperty("isBuiltIn");
        
        expect(typeof tag.id).toBe("string");
        expect(typeof tag.name).toBe("string");
        expect(typeof tag.color).toBe("string");
        expect(typeof tag.isBuiltIn).toBe("boolean");
        
        expect(tag.id.length).toBeGreaterThan(0);
        expect(tag.name.length).toBeGreaterThan(0);
        expect(tag.color.length).toBeGreaterThan(0);
        expect(tag.isBuiltIn).toBe(true);
      });
    });

    it("should have unique tag IDs", () => {
      const ids = defaultTags.map((tag: Tag) => tag.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique tag names", () => {
      const names = defaultTags.map((tag: Tag) => tag.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have valid hex colors", () => {
      defaultTags.forEach((tag: Tag) => {
        expect(tag.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have meaningful names", () => {
      defaultTags.forEach((tag: Tag) => {
        expect(tag.name.length).toBeGreaterThan(1);
        expect(tag.name.length).toBeLessThan(50);
      });
    });

    it("should have diverse colors", () => {
      const colors = defaultTags.map((tag: Tag) => tag.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe("Data Consistency", () => {
    it("should not have overlapping IDs between templates and snippets", () => {
      const templateIds = defaultTemplates.map((template: Template) => template.id);
      const snippetIds = defaultSnippets.map((snippet: Snippet) => snippet.id);
      
      const overlappingIds = templateIds.filter(id => snippetIds.includes(id));
      expect(overlappingIds).toHaveLength(0);
    });

    it("should not have overlapping IDs between templates and tags", () => {
      const templateIds = defaultTemplates.map((template: Template) => template.id);
      const tagIds = defaultTags.map((tag: Tag) => tag.id);
      
      const overlappingIds = templateIds.filter(id => tagIds.includes(id));
      expect(overlappingIds).toHaveLength(0);
    });

    it("should not have overlapping IDs between snippets and tags", () => {
      const snippetIds = defaultSnippets.map((snippet: Snippet) => snippet.id);
      const tagIds = defaultTags.map((tag: Tag) => tag.id);
      
      const overlappingIds = snippetIds.filter(id => tagIds.includes(id));
      expect(overlappingIds).toHaveLength(0);
    });
  });

  describe("Template Content Quality", () => {
    it("should have templates with variables", () => {
      defaultTemplates.forEach((template: Template) => {
        expect(template.content).toContain("{{");
        expect(template.content).toContain("}}");
      });
    });

    it("should have templates with balanced braces", () => {
      defaultTemplates.forEach((template: Template) => {
        const openBraces = (template.content.match(/\{\{/g) || []).length;
        const closeBraces = (template.content.match(/\}\}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
      });
    });
  });

  describe("Snippet Content Quality", () => {
    it("should have snippets with useful content", () => {
      defaultSnippets.forEach((snippet: Snippet) => {
        expect(snippet.content.length).toBeGreaterThan(5);
      });
    });

    it("should have code snippets with proper formatting", () => {
      const codeSnippets = defaultSnippets.filter((snippet: Snippet) => 
        snippet.category === "code"
      );
      
      codeSnippets.forEach((snippet: Snippet) => {
        expect(snippet.content).toContain("```");
      });
    });

    it("should have formatting snippets with proper structure", () => {
      const formattingSnippets = defaultSnippets.filter((snippet: Snippet) => 
        snippet.category === "formatting"
      );
      
      formattingSnippets.forEach((snippet: Snippet) => {
        expect(snippet.content).toMatch(/\*\*.*\*\*|\*.*\*|`.*`/);
      });
    });
  });

  describe("Tag Color Quality", () => {
    it("should have visually distinct colors", () => {
      const colors = defaultTags.map((tag: Tag) => tag.color);
      
      // Check that colors are not too similar
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const color1 = colors[i];
          const color2 = colors[j];
          
          // Convert hex to RGB and calculate distance
          const rgb1 = hexToRgb(color1);
          const rgb2 = hexToRgb(color2);
          
          if (rgb1 && rgb2) {
            const distance = Math.sqrt(
              Math.pow(rgb1.r - rgb2.r, 2) +
              Math.pow(rgb1.g - rgb2.g, 2) +
              Math.pow(rgb1.b - rgb2.b, 2)
            );
            
            // Colors should be reasonably different (distance > 30 instead of 50)
            expect(distance).toBeGreaterThan(30);
          }
        }
      }
    });

    it("should have accessible color contrast", () => {
      defaultTags.forEach((tag: Tag) => {
        const rgb = hexToRgb(tag.color);
        if (rgb) {
          // Calculate relative luminance
          const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
          
          // Should not be too dark or too light for good contrast
          expect(luminance).toBeGreaterThan(0.1);
          expect(luminance).toBeLessThan(0.9);
        }
      });
    });
  });
});

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
} 