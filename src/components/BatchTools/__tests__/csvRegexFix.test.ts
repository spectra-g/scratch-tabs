/**
 * Test for CSV regex find and replace fix
 * Tests the specific bug where regex with line anchors (^) didn't work properly
 */

import { applyTransformations } from "../transformations";

describe("CSV Regex Find and Replace Fix", () => {
  const csvContent = `name,age,city,country
John,25,New York,USA
Jane,30,London,UK
Bob,35,Paris,France
Alice,28,Tokyo,Japan`;

  it("should extract second column from CSV using regex with line anchors", () => {
    const config = {
      findReplaceRegex: {
        find: "^(?:[^,]*,)([^,]*)",
        replace: "$1",
        // flags: "gm" // Should be applied automatically
      }
    };

    const result = applyTransformations(csvContent, config);

    // Should replace "first_field,second_field" with just "second_field" on each line
    // leaving the rest of the line intact
    const expectedResult = `age,city,country
25,New York,USA
30,London,UK
35,Paris,France
28,Tokyo,Japan`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should handle line anchors properly with multiline flag", () => {
    const testContent = `line1,value1,extra1
line2,value2,extra2
line3,value3,extra3`;

    const config = {
      findReplaceRegex: {
        find: "^([^,]*),([^,]*),.*$",
        replace: "$1: $2",
      }
    };

    const result = applyTransformations(testContent, config);

    const expectedResult = `line1: value1
line2: value2
line3: value3`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should preserve line boundaries in replacement", () => {
    const testContent = `apple,red,fruit
banana,yellow,fruit
carrot,orange,vegetable`;

    const config = {
      findReplaceRegex: {
        find: "^([^,]*),([^,]*),([^,]*)$",
        replace: "$1 is $2 ($3)",
      }
    };

    const result = applyTransformations(testContent, config);

    const expectedResult = `apple is red (fruit)
banana is yellow (fruit)
carrot is orange (vegetable)`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should work with custom flags", () => {
    const testContent = `Name,Age
JOHN,25
jane,30`;

    const config = {
      findReplaceRegex: {
        find: "^([a-z]+),",
        replace: "Person: $1,",
        flags: "gmi" // Case insensitive + multiline
      }
    };

    const result = applyTransformations(testContent, config);

    const expectedResult = `Person: Name,Age
Person: JOHN,25
Person: jane,30`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should handle edge cases with empty lines", () => {
    const testContent = `first,line
,empty
last,line`;

    const config = {
      findReplaceRegex: {
        find: "^([^,]*),(.*)$",
        replace: "[$1] -> [$2]",
      }
    };

    const result = applyTransformations(testContent, config);

    const expectedResult = `[first] -> [line]
[] -> [empty]
[last] -> [line]`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should automatically add multiline flag when pattern contains line anchors", () => {
    const testContent = `start,middle,end
alpha,beta,gamma`;

    // Test that the fix automatically adds 'm' flag when ^ or $ are present
    const configWithoutM = {
      findReplaceRegex: {
        find: "^([^,]*)",
        replace: "PREFIX_$1",
        flags: "g" // No 'm' flag explicitly
      }
    };

    const result = applyTransformations(testContent, configWithoutM);

    const expectedResult = `PREFIX_start,middle,end
PREFIX_alpha,beta,gamma`;

    expect(result.trim()).toBe(expectedResult.trim());
  });

  it("should handle the exact user reported case - second column extraction from CSV", () => {
    // This is the exact use case reported by the user
    const csvInput = `name,age,city
John Doe,25,New York
Jane Smith,30,London
Bob Johnson,35,Paris`;

    const config = {
      findReplaceRegex: {
        find: "^(?:[^,]*,)([^,]*)", // User's regex to match second item on each row
        replace: "$1" // Replace with just the captured second field
      }
    };

    const result = applyTransformations(csvInput, config);

    // The result should show the second column extracted but remaining columns preserved
    // because the regex only matches the first two fields
    const expectedResult = `age,city
25,New York
30,London
35,Paris`;

    expect(result.trim()).toBe(expectedResult.trim());
  });
});