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
  });
});