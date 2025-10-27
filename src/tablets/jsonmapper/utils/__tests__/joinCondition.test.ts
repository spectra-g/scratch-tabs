import { transformJson } from "../mappingUtils";
import { MappingRule } from "../../types";

describe("transformJson - Join Condition", () => {
  // Helper to merge source data with target structure
  const createSourceWithTarget = (sourceData: any, targetStructure: any) => {
    return { ...sourceData, ...targetStructure };
  };

  describe("Array-to-nested-array with join", () => {
    it("should map conflicts to products by matching productId to id", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10, reason: "Stock issue" },
          { productId: "p2", priority: 5, reason: "Delivery delay" },
        ],
        products: [
          { id: "p123", name: "Widget", conflicts: [] },
          { id: "p1", name: "Gadget", conflicts: [] },
          { id: "p2", name: "Tool", conflicts: [] },
        ],
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['conflicts'][*]['priority']",
          targetPath: "$['products'][*]['conflicts'][*]['priority']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals",
          },
        },
        {
          id: "2",
          sourcePath: "$['conflicts'][*]['reason']",
          targetPath: "$['products'][*]['conflicts'][*]['reason']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals",
          },
        },
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Verify products[0] (id=p123) has no conflicts (no match)
      expect(result.products[0].conflicts).toEqual([]);

      // Verify products[1] (id=p1) has conflict from conflicts[0]
      expect(result.products[1].conflicts).toHaveLength(2); // 2 rules = 2 items per conflict
      expect(result.products[1].conflicts[0]).toMatchObject({ priority: 10 });
      expect(result.products[1].conflicts[1]).toMatchObject({ reason: "Stock issue" });

      // Verify products[2] (id=p2) has conflict from conflicts[1]
      expect(result.products[2].conflicts).toHaveLength(2);
      expect(result.products[2].conflicts[0]).toMatchObject({ priority: 5 });
      expect(result.products[2].conflicts[1]).toMatchObject({ reason: "Delivery delay" });
    });

    it("should handle one-to-one join mapping correctly", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10 },
        ],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
          { id: "p2", name: "Tool", conflicts: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Only products[0] (id=p1) should have a conflict
      expect(result.products[0].conflicts).toHaveLength(1);
      expect(result.products[0].conflicts[0]).toMatchObject({ priority: 10 });

      // products[1] should have empty conflicts
      expect(result.products[1].conflicts).toEqual([]);
    });

    it("should skip source items with no matching target (left join)", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10 },
          { productId: "p999", priority: 99 }, // No matching product
        ],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Only the matching conflict should be mapped
      expect(result.products[0].conflicts).toHaveLength(1);
      expect(result.products[0].conflicts[0]).toMatchObject({ priority: 10 });
    });

    it("should handle empty source array", () => {
      const sourceJson = {
        conflicts: [],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Products should remain unchanged
      expect(result.products[0].conflicts).toEqual([]);
    });

    it("should handle empty target array", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10 },
        ],
        products: [],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should complete without error, no matches possible
      expect(result.products).toEqual([]);
    });

    it("should handle null/undefined join keys gracefully", () => {
      const sourceJson = {
        conflicts: [
          { productId: null, priority: 10 },
          { priority: 20 }, // Missing productId
        ],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // No conflicts should be mapped (all have null/undefined keys)
      expect(result.products[0].conflicts).toEqual([]);
    });

    it("should support 'contains' match type", () => {
      const sourceJson = {
        conflicts: [
          { productCode: "p1", priority: 10 },
        ],
        products: [
          { sku: "PROD-p1-2024", name: "Gadget", issues: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['issues'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productCode",
          targetKey: "sku",
          matchType: "contains",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should match because "PROD-p1-2024" contains "p1"
      expect(result.products[0].issues).toHaveLength(1);
      expect(result.products[0].issues[0]).toMatchObject({ priority: 10 });
    });

    it("should support 'startsWith' match type", () => {
      const sourceJson = {
        conflicts: [
          { prefix: "PROD", priority: 10 },
        ],
        products: [
          { sku: "PROD-123", name: "Gadget", issues: [] },
          { sku: "ITEM-456", name: "Widget", issues: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['issues'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "prefix",
          targetKey: "sku",
          matchType: "startsWith",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Only first product should match (starts with "PROD")
      expect(result.products[0].issues).toHaveLength(1);
      expect(result.products[0].issues[0]).toMatchObject({ priority: 10 });
      expect(result.products[1].issues).toEqual([]);
    });

    it("should apply transformations with join conditions", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10 },
        ],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
        ],
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priorityLevel']",
        transformationType: "builtin",
        transformation: "append(' (high)')",
        sourceDataType: "number",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Transformation should be applied
      expect(result.products[0].conflicts).toHaveLength(1);
      expect(result.products[0].conflicts[0]).toMatchObject({
        priorityLevel: "10 (high)",
      });
    });
  });

  describe("Path format compatibility", () => {
    it("should handle dot notation paths correctly", () => {
      const sourceJson = {
        conflicts: [
          { productId: "p1", priority: 10, reason: "Stock issue" },
          { productId: "p2", priority: 5, reason: "Delivery delay" },
        ],
        products: [
          { id: "p1", name: "Gadget", conflicts: [] },
          { id: "p2", name: "Tool", conflicts: [] },
        ],
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.conflicts[*].priority",
          targetPath: "$.products[*].conflicts[*].priority",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals",
          },
        },
        {
          id: "2",
          sourcePath: "$.conflicts[*].reason",
          targetPath: "$.products[*].conflicts[*].reason",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals",
          },
        },
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Should create proper nested structure, not malformed keys
      expect(result.products[0].conflicts).toBeDefined();
      expect(Array.isArray(result.products[0].conflicts)).toBe(true);

      // Check that keys are properly formed
      const product1Conflicts = result.products[0].conflicts;
      if (product1Conflicts.length > 0) {
        const firstConflict = product1Conflicts[0];
        // Should NOT have malformed keys like "conflicts'][*]['priority"
        expect(Object.keys(firstConflict).some(k => k.includes("']"))).toBe(false);
        expect(Object.keys(firstConflict).some(k => k.includes("['"))).toBe(false);
      }

      // Verify correct mapping
      expect(result.products[0].conflicts).toHaveLength(2);
      expect(result.products[0].conflicts[0]).toMatchObject({ priority: 10 });
      expect(result.products[0].conflicts[1]).toMatchObject({ reason: "Stock issue" });

      expect(result.products[1].conflicts).toHaveLength(2);
      expect(result.products[1].conflicts[0]).toMatchObject({ priority: 5 });
      expect(result.products[1].conflicts[1]).toMatchObject({ reason: "Delivery delay" });
    });
  });

  describe("Performance optimization", () => {
    it("should handle large arrays efficiently with Map lookup", () => {
      // Create large arrays to test O(n+m) performance
      const conflicts = Array.from({ length: 1000 }, (_, i) => ({
        productId: `p${i}`,
        priority: i,
      }));

      const products = Array.from({ length: 1000 }, (_, i) => ({
        id: `p${i}`,
        name: `Product ${i}`,
        conflicts: [],
      }));

      const sourceJson = { conflicts, products };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['conflicts'][*]['priority']",
        targetPath: "$['products'][*]['conflicts'][*]['priority']",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
        joinCondition: {
          sourceKey: "productId",
          targetKey: "id",
          matchType: "equals",
        },
      };

      const startTime = Date.now();
      const result = transformJson(sourceJson, [rule], "sourceToTarget");
      const endTime = Date.now();

      // Should complete quickly (< 500ms for 1000 items)
      expect(endTime - startTime).toBeLessThan(500);

      // Verify correct mapping
      expect(result.products[0].conflicts).toHaveLength(1);
      expect(result.products[0].conflicts[0]).toMatchObject({ priority: 0 });
      expect(result.products[999].conflicts).toHaveLength(1);
      expect(result.products[999].conflicts[0]).toMatchObject({ priority: 999 });
    });
  });
});
