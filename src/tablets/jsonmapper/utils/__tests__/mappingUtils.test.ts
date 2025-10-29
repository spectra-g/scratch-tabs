import { transformJson } from "../mappingUtils";
import { MappingRule } from "../../types";

describe("transformJson", () => {
  describe("basic field mappings", () => {
    it("should map simple string fields", () => {
      const sourceJson = {
        name: "John Doe",
        age: 30
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['name']",
          targetPath: "$['fullName']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['age']",
          targetPath: "$['years']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        fullName: "John Doe",
        years: 30
      });
    });

    it("should handle nested object mappings", () => {
      const sourceJson = {
        user: {
          profile: {
            firstName: "John",
            lastName: "Doe"
          }
        }
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['user']['profile']['firstName']",
          targetPath: "$['customer']['name']['first']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['user']['profile']['lastName']",
          targetPath: "$['customer']['name']['last']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        customer: {
          name: {
            first: "John",
            last: "Doe"
          }
        }
      });
    });
  });

  describe("array mappings", () => {
    it("should map simple arrays with primitive values", () => {
      const sourceJson = {
        tags: ["sample", "json", "data"]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['tags'][*]",
          targetPath: "$['labels'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        labels: ["sample", "json", "data"]
      });
    });

    it("should reproduce the reported bug with array mapping", () => {
      const sourceJson = {
        name: "Sample JSON",
        description: "A sample JSON object with various data types",
        isActive: true,
        count: 42,
        price: 19.99,
        tags: [
          "sample",
          "json",
          "data"
        ],
        metadata: {
          created: "2025-08-11T20:06:08.227Z",
          version: "1.0",
          random: 0.2687671869007664
        }
      };

      const rules: MappingRule[] = [
        {
          id: "7ceb25cc-a5b1-41dd-ad8c-9623744913e2",
          sourcePath: "$['count']",
          targetPath: "$['count1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0333333333333334,
          isUserDefined: false
        },
        {
          id: "d9cf6a50-1e34-4bf1-9ea9-49580f36e716",
          sourcePath: "$['description']",
          targetPath: "$['description1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0714285714285714,
          isUserDefined: false
        },
        {
          id: "cd55d6ff-9e7a-41ae-b4c5-649cd6c9928b",
          sourcePath: "$['isActive']",
          targetPath: "$['isActive1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "boolean",
          targetDataType: "boolean",
          status: "mapped",
          confidence: 1.06,
          isUserDefined: false
        },
        {
          id: "4dd85547-fb76-4d00-ac56-4a3e3d452516",
          sourcePath: "$['metadata']['created']",
          targetPath: "$['metadata1']['created1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0442307692307693,
          isUserDefined: false
        },
        {
          id: "ebb8ec6d-0f67-444d-a823-60f712d76a88",
          sourcePath: "$['metadata']['random']",
          targetPath: "$['metadata1']['random1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.036969696969697,
          isUserDefined: false
        },
        {
          id: "39633c63-4859-4da9-80e3-0deb1b3205a8",
          sourcePath: "$['metadata']['version']",
          targetPath: "$['metadata1']['version1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0442307692307693,
          isUserDefined: false
        },
        {
          id: "b10ab5c4-0593-4b39-b40f-377f8e0d3866",
          sourcePath: "$['name']",
          targetPath: "$['name1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0142857142857145,
          isUserDefined: false
        },
        {
          id: "02763258-3d71-4bab-adc1-214c2a7a0251",
          sourcePath: "$['price']",
          targetPath: "$['price1']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0333333333333334,
          isUserDefined: false
        },
        {
          id: "759aa698-2700-4583-9159-5a6516e2feb9",
          sourcePath: "$['tags'][*]",
          targetPath: "$['tags1'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0538461538461539,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      const expected = {
        name1: "Sample JSON",
        description1: "A sample JSON object with various data types",
        isActive1: true,
        count1: 42,
        price1: 19.99,
        tags1: [
          "sample",
          "json",
          "data"
        ],
        metadata1: {
          created1: "2025-08-11T20:06:08.227Z",
          version1: "1.0",
          random1: 0.2687671869007664
        }
      };

      expect(result).toEqual(expected);
    });

    it("should handle array of objects mapping", () => {
      const sourceJson = {
        users: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['users'][*]['name']",
          targetPath: "$['customers'][*]['fullName']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['users'][*]['age']",
          targetPath: "$['customers'][*]['years']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        customers: [
          { fullName: "John", years: 30 },
          { fullName: "Jane", years: 25 }
        ]
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty arrays", () => {
      const sourceJson = {
        tags: []
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['tags'][*]",
          targetPath: "$['labels'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        labels: []
      });
    });

    it("should handle null values", () => {
      const sourceJson = {
        name: null,
        age: 30
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['name']",
          targetPath: "$['fullName']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        fullName: null
      });
    });

    it("should handle undefined source values gracefully", () => {
      const sourceJson = {
        age: 30
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['name']",
          targetPath: "$['fullName']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['age']",
          targetPath: "$['years']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        years: 30
      });
    });
  });

  describe("mixed data types in arrays", () => {
    it("should handle arrays with mixed primitive types", () => {
      const sourceJson = {
        values: ["string", 42, true, null]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['values'][*]",
          targetPath: "$['data'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        data: ["string", 42, true, null]
      });
    });

    it("should handle nested arrays", () => {
      const sourceJson = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6]
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['matrix'][*]",
          targetPath: "$['grid'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "array",
          targetDataType: "array",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        grid: [[1, 2, 3], [4, 5, 6]]
      });
    });
  });

  describe("complex object mappings", () => {
    it("should handle deeply nested object mapping", () => {
      const sourceJson = {
        company: {
          departments: {
            engineering: {
              teams: {
                backend: {
                  lead: "John Doe"
                }
              }
            }
          }
        }
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['company']['departments']['engineering']['teams']['backend']['lead']",
          targetPath: "$['organization']['divisions']['tech']['groups']['server']['manager']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        organization: {
          divisions: {
            tech: {
              groups: {
                server: {
                  manager: "John Doe"
                }
              }
            }
          }
        }
      });
    });

    it("should handle array of objects with nested properties", () => {
      const sourceJson = {
        employees: [
          {
            profile: {
              personal: {
                name: "John",
                age: 30
              },
              work: {
                department: "Engineering",
                role: "Developer"
              }
            }
          },
          {
            profile: {
              personal: {
                name: "Jane",
                age: 28
              },
              work: {
                department: "Design",
                role: "Designer"
              }
            }
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['employees'][*]['profile']['personal']['name']",
          targetPath: "$['staff'][*]['info']['fullName']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['employees'][*]['profile']['work']['department']",
          targetPath: "$['staff'][*]['workplace']['division']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        staff: [
          {
            info: {
              fullName: "John"
            },
            workplace: {
              division: "Engineering"
            }
          },
          {
            info: {
              fullName: "Jane"
            },
            workplace: {
              division: "Design"
            }
          }
        ]
      });
    });
  });

  describe("special values", () => {
    it("should handle boolean values correctly", () => {
      const sourceJson = {
        flags: [true, false, true]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['flags'][*]",
          targetPath: "$['settings'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "boolean",
          targetDataType: "boolean",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        settings: [true, false, true]
      });
    });

    it("should handle number arrays correctly", () => {
      const sourceJson = {
        scores: [85.5, 92.0, 78.3, 96.7]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['scores'][*]",
          targetPath: "$['grades'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        grades: [85.5, 92.0, 78.3, 96.7]
      });
    });

    it("should handle arrays with null values", () => {
      const sourceJson = {
        optionalData: ["value1", null, "value3", null]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['optionalData'][*]",
          targetPath: "$['cleanData'][*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        cleanData: ["value1", null, "value3", null]
      });
    });

    it("should merge multiple fields from flat array into same nested array object", () => {
      // Bug fix: When mapping multiple fields from a flat array to a nested array,
      // they should be merged into the same object, not create separate objects
      const sourceJson = {
        conflicts: [
          {
            productId: "p1",
            priority: 10,
            reason: "Stock issue"
          },
          {
            productId: "p2",
            priority: 5,
            reason: "Delivery delay"
          }
        ]
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
          isUserDefined: true
        },
        {
          id: "2",
          sourcePath: "$['conflicts'][*]['productId']",
          targetPath: "$['products'][*]['id']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 0.33,
          isUserDefined: false
        },
        {
          id: "3",
          sourcePath: "$.conflicts[*].reason",
          targetPath: "$.products[*].conflicts[*].reason",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.05,
          isUserDefined: true
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Both priority and reason should be in the SAME nested object
      expect(result).toEqual({
        products: [
          {
            id: "p1",
            conflicts: [
              {
                priority: 10,
                reason: "Stock issue"
              }
            ]
          },
          {
            id: "p2",
            conflicts: [
              {
                priority: 5,
                reason: "Delivery delay"
              }
            ]
          }
        ]
      });
    });

    it("should extract specific nested field value, not entire nested object", () => {
      // Bug fix: When mapping from a nested path like filters[*].filters[*].filterTag.id,
      // should extract just the 'id' value, not the entire filterTag object
      const sourceJson = {
        criteria: {
          filters: [
            {
              filters: [
                {
                  filterTag: {
                    id: "ft01",
                    group: "g01"
                  }
                }
              ]
            }
          ]
        }
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['criteria']['filters'][*]['filters'][*]['filterTag']['group']",
          targetPath: "$['criteria']['filters'][*]['filters'][*]['group']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.075,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['criteria']['filters'][*]['filters'][*]['filterTag']['id']",
          targetPath: "$['criteria']['filters'][*]['filters'][*]['id']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.073,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Should extract just id and group values, not nest the entire filterTag object
      expect(result).toEqual({
        criteria: {
          filters: [
            {
              filters: [
                {
                  id: "ft01",
                  group: "g01"
                }
              ]
            }
          ]
        }
      });
    });

    it("should handle dot notation paths correctly", () => {
      // Bug fix: Dot notation like .depositCharge wasn't being parsed correctly
      const sourceJson = {
        conflicts: [
          {
            depositCharge: "12",
            productId: "p1",
            priority: 10
          },
          {
            productId: "p2",
            priority: 5
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.conflicts[*].depositCharge",
          targetPath: "$.conflicts[*].depositCharge",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Should correctly extract and map depositCharge from first item only
      expect(result).toEqual({
        conflicts: [
          {
            depositCharge: "12"
          }
        ]
      });
    });

    it("should remove empty objects from arrays after mapping", () => {
      // Bug fix: Empty objects should be cleaned up from arrays
      const sourceJson = {
        items: [
          {
            id: "1",
            value: "A"
          },
          {
            id: "2"
            // No value field
          },
          {
            id: "3",
            value: "C"
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.items[*].value",
          targetPath: "$.output[*].value",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Should only have 2 items, empty object removed
      expect(result).toEqual({
        output: [
          { value: "A" },
          { value: "C" }
        ]
      });
    });

    it("should merge multiple join condition rules into same nested object", () => {
      // Bug fix: Multiple rules with join conditions should merge into the same nested object
      const sourceJson = {
        conflicts: [
          {
            productId: "p1",
            priority: 10,
            reason: "Stock issue"
          },
          {
            productId: "p2",
            priority: 5,
            reason: "Delivery delay"
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$['conflicts'][*]['productId']",
          targetPath: "$['products'][*]['id']",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 0.33,
          isUserDefined: false
        },
        {
          id: "2",
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
            matchType: "equals"
          }
        },
        {
          id: "3",
          sourcePath: "$.conflicts[*].reason",
          targetPath: "$.products[*].conflicts[*].reason",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.05,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Both priority and reason should be in the SAME nested object
      expect(result).toEqual({
        products: [
          {
            id: "p1",
            conflicts: [
              {
                priority: 10,
                reason: "Stock issue"
              }
            ]
          },
          {
            id: "p2",
            conflicts: [
              {
                priority: 5,
                reason: "Delivery delay"
              }
            ]
          }
        ]
      });
    });

    it("should handle mixed dot and bracket notation in paths", () => {
      const sourceJson = {
        users: [
          {
            name: "Alice",
            age: 30
          },
          {
            name: "Bob",
            age: 25
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.users[*].name",  // Dot notation
          targetPath: "$['people'][*]['fullName']",  // Bracket notation
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        },
        {
          id: "2",
          sourcePath: "$['users'][*]['age']",  // Bracket notation
          targetPath: "$.people[*].years",  // Dot notation
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      expect(result).toEqual({
        people: [
          {
            fullName: "Alice",
            years: 30
          },
          {
            fullName: "Bob",
            years: 25
          }
        ]
      });
    });

    it("should not create empty objects when source values are undefined", () => {
      const sourceJson = {
        items: [
          { a: 1 },
          { b: 2 },
          { c: 3 }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.items[*].a",
          targetPath: "$.output[*].value",
          transformationType: "none",
          transformation: "",
          sourceDataType: "number",
          targetDataType: "number",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: false
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Should only have one item (only first source item has 'a' field)
      expect(result).toEqual({
        output: [
          { value: 1 }
        ]
      });
    });
  });

  describe("Nested array wildcard in field paths", () => {
    it("should handle nested array wildcard in field path (uoms example)", () => {
      const sourceJson = {
        products: [
          {
            weights: {
              per: "per01",
              price: "123",
              uoms: ["C62", "KG"]
            }
          },
          {
            weights: {
              per: "per02",
              price: "456",
              uoms: ["LB"]
            }
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].weights.uoms[*]",
        targetPath: "$.products[*].weights.uoms[*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.products).toHaveLength(2);
      expect(result.products[0].weights.uoms).toEqual(["C62", "KG"]);
      expect(result.products[1].weights.uoms).toEqual(["LB"]);
    });

    it("should handle nested array wildcard with dot notation", () => {
      const sourceJson = {
        items: [
          { tags: ["tag1", "tag2", "tag3"] },
          { tags: ["tag4"] }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.items[*].tags[*]",
        targetPath: "$.items[*].tags[*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.items).toHaveLength(2);
      expect(result.items[0].tags).toEqual(["tag1", "tag2", "tag3"]);
      expect(result.items[1].tags).toEqual(["tag4"]);
    });

    it("should handle empty nested arrays", () => {
      const sourceJson = {
        products: [
          { weights: { uoms: [] } },
          { weights: { uoms: ["KG"] } }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].weights.uoms[*]",
        targetPath: "$.products[*].weights.uoms[*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.products[0].weights.uoms).toEqual([]);
      expect(result.products[1].weights.uoms).toEqual(["KG"]);
    });

    it("should handle nested array wildcard with bracket notation", () => {
      const sourceJson = {
        data: [
          { values: [1, 2, 3] },
          { values: [4, 5] }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$['data'][*]['values'][*]",
        targetPath: "$['data'][*]['values'][*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "number",
        targetDataType: "number",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.data[0].values).toEqual([1, 2, 3]);
      expect(result.data[1].values).toEqual([4, 5]);
    });

    it("should handle nested array wildcard with transformation", () => {
      const sourceJson = {
        items: [
          { codes: ["a", "b"] },
          { codes: ["c"] }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.items[*].codes[*]",
        targetPath: "$.items[*].codes[*]",
        transformationType: "builtin",
        transformation: "toUpperCase()",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.items[0].codes).toEqual(["A", "B"]);
      expect(result.items[1].codes).toEqual(["C"]);
    });

    it("should handle deeply nested array wildcards", () => {
      const sourceJson = {
        level1: [
          {
            level2: {
              level3: {
                items: ["a", "b"]
              }
            }
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.level1[*].level2.level3.items[*]",
        targetPath: "$.level1[*].level2.level3.items[*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.level1[0].level2.level3.items).toEqual(["a", "b"]);
    });
  });

  describe("Empty array handling", () => {
    it("should create empty target array when source array is empty", () => {
      const sourceJson = {
        promotions: [],
        searchTags: []
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.promotions[*].name",
          targetPath: "$.promotions[*].name",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
        },
        {
          id: "2",
          sourcePath: "$.searchTags[*]",
          targetPath: "$.searchTags[*]",
          transformationType: "none",
          transformation: "",
          sourceDataType: "string",
          targetDataType: "string",
          status: "mapped",
          confidence: 1.0,
          isUserDefined: true,
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Empty arrays should be created in target
      expect(result.promotions).toBeDefined();
      expect(Array.isArray(result.promotions)).toBe(true);
      expect(result.promotions).toEqual([]);

      expect(result.searchTags).toBeDefined();
      expect(Array.isArray(result.searchTags)).toBe(true);
      expect(result.searchTags).toEqual([]);
    });

    it("should create empty nested target array when source nested array is empty", () => {
      const sourceJson = {
        products: [
          {
            id: "p1",
            tags: []
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].tags[*]",
        targetPath: "$.products[*].tags[*]",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      expect(result.products).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].tags).toBeDefined();
      expect(Array.isArray(result.products[0].tags)).toBe(true);
      expect(result.products[0].tags).toEqual([]);
    });

    it("should not overwrite existing non-empty target array with empty source array", () => {
      const sourceJson = {
        items: []
      };

      const outputWithExisting = {
        items: [{ id: "existing" }]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.items[*].id",
        targetPath: "$.items[*].id",
        transformationType: "none",
        transformation: "",
        sourceDataType: "string",
        targetDataType: "string",
        status: "mapped",
        confidence: 1.0,
        isUserDefined: true,
      };

      // Pass outputWithExisting as the initial output
      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should create empty array since source is empty
      expect(result.items).toBeDefined();
      expect(result.items).toEqual([]);
    });

    it("should preserve empty nested arrays without deep cloning unmapped fields", () => {
      // Bug fix: When mapping nested arrays where inner array is empty,
      // should NOT deep clone entire parent structure (which includes unmapped fields)
      const sourceJson = {
        searchTags: [],
        conflicts: [
          {
            depositCharge: "12",
            productId: "p1",
            priority: 10,
            reason: "Stock issue"
          },
          {
            productId: "p2",
            priority: 5,
            reason: "Delivery delay"
          }
        ],
        criteria: {
          filters: [
            {
              filters: [
                {
                  filterTag: {
                    id: "ft01",
                    group: "g01"
                  }
                }
              ]
            }
          ]
        },
        products: [
          {
            promotions: [],
            weights: {
              per: "per01",
              price: "123",
              uoms: ["C62"]
            }
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].promotions[*].prom",
        targetPath: "$.products[*].promotions[*].prom",
        transformationType: "none",
        transformation: "",
        sourceDataType: "unknown",
        targetDataType: "unknown",
        status: "unmapped",
        confidence: 0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should ONLY include products with promotions array, NOT weights or other unmapped fields
      expect(result).toEqual({
        products: [
          {
            promotions: []
          }
        ]
      });

      // Explicitly verify weights was NOT included
      expect(result.products[0].weights).toBeUndefined();
    });

    it("should preserve empty nested arrays when mapping to different nested location with intermediate objects", () => {
      // Bug fix: When mapping products[*].promotions[*] to products[*].pricing.promotions[*]
      // with intermediate object "pricing", empty array should be created at correct nested location
      const sourceJson = {
        searchTags: [],
        conflicts: [
          {
            depositCharge: "12",
            productId: "p1",
            priority: 10,
            reason: "Stock issue"
          },
          {
            productId: "p2",
            priority: 5,
            reason: "Delivery delay"
          }
        ],
        criteria: {
          filters: [
            {
              filters: [
                {
                  filterTag: {
                    id: "ft01",
                    group: "g01"
                  }
                }
              ]
            }
          ]
        },
        products: [
          {
            promotions: [],
            weights: {
              per: "per01",
              price: "123",
              uoms: ["C62"]
            }
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].promotions[*].prom",
        targetPath: "$.products[*].pricing.promotions[*].prom",
        transformationType: "none",
        transformation: "",
        sourceDataType: "unknown",
        targetDataType: "unknown",
        status: "unmapped",
        confidence: 0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should create nested structure: products[0].pricing.promotions = []
      expect(result).toEqual({
        products: [
          {
            pricing: {
              promotions: []
            }
          }
        ]
      });

      // Verify correct nested structure
      expect(result.products[0].pricing).toBeDefined();
      expect(result.products[0].pricing.promotions).toBeDefined();
      expect(Array.isArray(result.products[0].pricing.promotions)).toBe(true);
      expect(result.products[0].pricing.promotions).toEqual([]);

      // Explicitly verify weights and other unmapped fields are NOT included
      expect(result.products[0].weights).toBeUndefined();
    });

    it("should handle non-empty nested arrays when mapping to different nested location with intermediate objects", () => {
      // Bug fix: When mapping products[*].promotions[*] to products[*].pricing.promotions[*]
      // with non-empty source array, should create array at correct nested location
      const sourceJson = {
        searchTags: [],
        conflicts: [
          {
            depositCharge: "12",
            productId: "p1",
            priority: 10,
            reason: "Stock issue"
          },
          {
            productId: "p2",
            priority: 5,
            reason: "Delivery delay"
          }
        ],
        criteria: {
          filters: [
            {
              filters: [
                {
                  filterTag: {
                    id: "ft01",
                    group: "g01"
                  }
                }
              ]
            }
          ]
        },
        products: [
          {
            promotions: [{ prom: "123" }],
            weights: {
              per: "per01",
              price: "123",
              uoms: ["C62"]
            }
          }
        ]
      };

      const rule: MappingRule = {
        id: "1",
        sourcePath: "$.products[*].promotions[*].prom",
        targetPath: "$.products[*].pricing.promotions[*].prom",
        transformationType: "none",
        transformation: "",
        sourceDataType: "unknown",
        targetDataType: "unknown",
        status: "unmapped",
        confidence: 0,
        isUserDefined: true,
      };

      const result = transformJson(sourceJson, [rule], "sourceToTarget");

      // Should create nested structure: products[0].pricing.promotions = [{ prom: "123" }]
      expect(result).toEqual({
        products: [
          {
            pricing: {
              promotions: [
                {
                  prom: "123"
                }
              ]
            }
          }
        ]
      });

      // Verify correct nested structure
      expect(result.products[0].pricing).toBeDefined();
      expect(result.products[0].pricing.promotions).toBeDefined();
      expect(Array.isArray(result.products[0].pricing.promotions)).toBe(true);
      expect(result.products[0].pricing.promotions).toHaveLength(1);
      expect(result.products[0].pricing.promotions[0].prom).toBe("123");

      // Explicitly verify weights and other unmapped fields are NOT included
      expect(result.products[0].weights).toBeUndefined();
    });

    it("should map nested object fields (messages.reason) in join conditions - user bug report", () => {
      // User bug report: messages.reason rule exists but doesn't appear in output
      const sourceJson = {
        products: [
          {
            id: "12-34-56"
          }
        ],
        conflicts: [
          {
            productId: "12-34-56",
            priority: 10,
            actions: [
              "act01",
              "act02"
            ],
            messages: {
              reason: "res01",
              dismissal: "No"
            }
          },
          {
            productId: "22-44-66",
            priority: 13,
            actions: [
              "act03",
              "act04"
            ],
            messages: {
              reason: "res02",
              dismissal: "Yes"
            }
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "7b081d98-ac9e-4b9a-aaa4-fa6b9ce158fd",
          sourcePath: "$.conflicts[*].actions",
          targetPath: "$.products[*].conflicts[*].actions",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        },
        {
          id: "dc6dea73-cd5c-446b-86ef-3e53d8c3a2ff",
          sourcePath: "$.conflicts[*].messages.reason",
          targetPath: "$.products[*].conflicts[*].messages.reason",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        },
        {
          id: "6bce08b4-eac1-4004-ac4a-ec986b4b21ee",
          sourcePath: "$.conflicts[*].priority",
          targetPath: "$.products[*].conflicts[*].priority",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        },
        {
          id: "d4537f8c-d10a-4aeb-9649-c64e9c39ec0b",
          sourcePath: "$.products[*].id",
          targetPath: "$.products[*].id",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Expected output should include messages.reason but currently it doesn't appear
      expect(result).toEqual({
        products: [
          {
            id: "12-34-56",
            conflicts: [
              {
                priority: 10,
                actions: [
                  "act01",
                  "act02"
                ],
                messages: {
                  reason: "res01"
                  // dismissal should NOT be included (no rule for it)
                }
              }
            ]
          }
        ]
      });

      // Verify messages object exists
      expect(result.products[0].conflicts[0].messages).toBeDefined();
      // Verify reason field exists
      expect(result.products[0].conflicts[0].messages.reason).toBe("res01");
      // Verify dismissal is NOT included
      expect(result.products[0].conflicts[0].messages.dismissal).toBeUndefined();
    });

    it("should map nested array items with [*][*] notation - user bug report #2", () => {
      // User bug: conflicts[*].actions works, but conflicts[*].actions[*] doesn't appear in output
      const sourceJson = {
        products: [
          {
            id: "12-34-56"
          }
        ],
        conflicts: [
          {
            productId: "12-34-56",
            priority: 10,
            actions: [
              "act01",
              "act02"
            ]
          },
          {
            productId: "22-44-66",
            priority: 13,
            actions: [
              "act03",
              "act04"
            ]
          }
        ]
      };

      const rules: MappingRule[] = [
        {
          id: "1",
          sourcePath: "$.conflicts[*].actions[*]",  // Nested array wildcard
          targetPath: "$.products[*].conflicts[*].actions[*]",  // Nested array wildcard
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        },
        {
          id: "2",
          sourcePath: "$.conflicts[*].priority",
          targetPath: "$.products[*].conflicts[*].priority",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true,
          joinCondition: {
            sourceKey: "productId",
            targetKey: "id",
            matchType: "equals"
          }
        },
        {
          id: "3",
          sourcePath: "$.products[*].id",
          targetPath: "$.products[*].id",
          transformationType: "none",
          transformation: "",
          sourceDataType: "unknown",
          targetDataType: "unknown",
          status: "unmapped",
          confidence: 0,
          isUserDefined: true
        }
      ];

      const result = transformJson(sourceJson, rules, "sourceToTarget");

      // Expected: actions array should be populated with nested wildcard
      expect(result).toEqual({
        products: [
          {
            id: "12-34-56",
            conflicts: [
              {
                priority: 10,
                actions: [
                  "act01",
                  "act02"
                ]
              }
            ]
          }
        ]
      });

      // Verify actions array exists and has correct items
      expect(result.products[0].conflicts[0].actions).toBeDefined();
      expect(Array.isArray(result.products[0].conflicts[0].actions)).toBe(true);
      expect(result.products[0].conflicts[0].actions).toEqual(["act01", "act02"]);
    });
  });
});