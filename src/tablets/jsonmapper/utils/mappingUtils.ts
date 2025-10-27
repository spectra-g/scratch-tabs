import stringSimilarity from "string-similarity";
import {
  MappingRule,
  PathInfo,
  SuggestionResult,
  MappingDirection,
  MappingStatus,
  TargetLanguage,
} from "../types";
import {
  getValueByPath,
  setValueByPath,
  getDataType,
  jsonPathToReadablePath,
  parseJsonPathSegments,
} from "./jsonUtils";

/**
 * Helper to extract path segments for join condition mapping
 * Handles both dot notation ($.array[*].field) and bracket notation ($['array'][*]['field'])
 */
function extractJoinPathSegments(path: string) {
  // Find all [*] positions
  const wildcards: number[] = [];
  let index = 0;
  while ((index = path.indexOf("[*]", index)) !== -1) {
    wildcards.push(index);
    index += 3;
  }

  if (wildcards.length < 2) {
    return null; // Not a nested array path
  }

  const firstWildcardIndex = wildcards[0];
  const lastWildcardIndex = wildcards[wildcards.length - 1];

  // Extract parent array path (everything before first [*])
  const parentArrayPath = path.substring(0, firstWildcardIndex);

  // Extract nested array path (between first [*] and last [*])
  const betweenWildcards = path.substring(firstWildcardIndex + 3, lastWildcardIndex);

  // Parse nested array name from betweenWildcards
  // Handle formats: .conflicts, ['conflicts'], .['conflicts']
  let nestedArrayName = betweenWildcards
    .replace(/^\['/, "") // Remove leading ['
    .replace(/'\]$/, "") // Remove trailing ']
    .replace(/^\./, "")  // Remove leading .
    .replace(/\['/, "")  // Remove ['
    .replace(/'\]/, ""); // Remove ']

  // Extract field path after last [*]
  const afterLastWildcard = path.substring(lastWildcardIndex + 3);

  // Parse field name
  // Handle formats: .priority, ['priority']
  let fieldName = afterLastWildcard
    .replace(/^\['/, "")  // Remove leading ['
    .replace(/'\]$/, "")  // Remove trailing ']
    .replace(/^\./, "");  // Remove leading .

  return {
    parentArrayPath,
    nestedArrayName,
    fieldName,
  };
}

/**
 * Suggests mappings between source and target JSON
 */
export function suggestMappings(
  sourcePaths: PathInfo[],
  targetPaths: PathInfo[],
): SuggestionResult[] {
  const suggestions: SuggestionResult[] = [];

  // Filter out array and object paths, we only want to map leaf nodes
  const sourceLeafPaths = sourcePaths.filter(
    (p) => p.type !== "array" && p.type !== "object",
  );

  const targetLeafPaths = targetPaths.filter(
    (p) => p.type !== "array" && p.type !== "object",
  );

  // For each source path, find the best matching target path
  for (const sourcePath of sourceLeafPaths) {
    const sourceReadablePath = jsonPathToReadablePath(sourcePath.path);
    const sourcePathParts = sourceReadablePath
      .split(/[.\[\]]+/)
      .filter(Boolean);
    const sourceLastPart = sourcePathParts[sourcePathParts.length - 1];

    let bestMatch: SuggestionResult | null = null;

    for (const targetPath of targetLeafPaths) {
      const targetReadablePath = jsonPathToReadablePath(targetPath.path);
      const targetPathParts = targetReadablePath
        .split(/[.\[\]]+/)
        .filter(Boolean);
      const targetLastPart = targetPathParts[targetPathParts.length - 1];

      // Calculate similarity scores
      const lastPartSimilarity = stringSimilarity.compareTwoStrings(
        sourceLastPart.toLowerCase(),
        targetLastPart.toLowerCase(),
      );

      const fullPathSimilarity = stringSimilarity.compareTwoStrings(
        sourceReadablePath.toLowerCase(),
        targetReadablePath.toLowerCase(),
      );

      // Check if values are equal (for primitive types)
      const valueMatch =
        sourcePath.value === targetPath.value &&
        sourcePath.value !== null &&
        targetPath.value !== null &&
        sourcePath.type !== "object" &&
        sourcePath.type !== "array" &&
        targetPath.type !== "object" &&
        targetPath.type !== "array";

      // Calculate overall confidence score
      let confidence = 0;

      if (valueMatch) {
        confidence += 0.4; // High weight for matching values
      }

      confidence += lastPartSimilarity * 0.4; // High weight for matching property names
      confidence += fullPathSimilarity * 0.2; // Lower weight for full path similarity

      // Bonus for matching types
      if (sourcePath.type === targetPath.type) {
        confidence += 0.1;
      }

      // Only consider matches with confidence above threshold
      if (confidence > 0.3) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            sourcePath: sourcePath.path,
            targetPath: targetPath.path,
            confidence,
            sourceType: sourcePath.type,
            targetType: targetPath.type,
          };
        }
      }
    }

    if (bestMatch) {
      suggestions.push(bestMatch);
    }
  }

  // Sort by confidence (descending)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Creates mapping rules from suggestions
 */
export function createRulesFromSuggestions(
  suggestions: SuggestionResult[],
): MappingRule[] {
  return suggestions.map((suggestion) => ({
    id: crypto.randomUUID(),
    sourcePath: suggestion.sourcePath,
    targetPath: suggestion.targetPath,
    transformationType: "none",
    transformation: "",
    sourceDataType: suggestion.sourceType,
    targetDataType: suggestion.targetType,
    status: "mapped",
    confidence: suggestion.confidence,
    isUserDefined: false,
  }));
}

/**
 * Transforms a source JSON to a target JSON using mapping rules
 */
export function transformJson(
  sourceJson: any,
  rules: MappingRule[],
  direction: MappingDirection = "sourceToTarget",
): any {
  let outputObject: any = {};
  // Initialize outputObject as array if the first rule's target path implies it
  const firstMeaningfulRule = rules.find((r) => {
    const pathToCheck =
      direction === "sourceToTarget" ? r.targetPath : r.sourcePath;
    return pathToCheck && pathToCheck !== "$";
  });
  if (firstMeaningfulRule) {
    const firstTargetPath =
      direction === "sourceToTarget"
        ? firstMeaningfulRule.targetPath
        : firstMeaningfulRule.sourcePath;
    if (firstTargetPath) {
      const segments = parseJsonPathSegments(firstTargetPath);
      if (
        segments.length > 0 &&
        (typeof segments[0] === "number" || segments[0] === "*")
      ) {
        outputObject = [];
      }
    }
  }

  // Sort rules to ensure parent paths are processed before child paths
  const activeRules = rules
    .filter((rule) => rule.status !== "ignored" && rule.status !== "error")
    .sort((a, b) => {
      const pathA =
        direction === "sourceToTarget" ? a.targetPath : a.sourcePath;
      const pathB =
        direction === "sourceToTarget" ? b.targetPath : b.sourcePath;
      // Sort by path depth - shorter paths (parent objects) first
      return pathA.split(/[\[\].]/).length - pathB.split(/[\[\].]/).length;
    });

  // Process all rules
  for (const rule of activeRules) {
    const currentRuleSourcePath =
      direction === "sourceToTarget" ? rule.sourcePath : rule.targetPath;
    const currentRuleTargetPath =
      direction === "sourceToTarget" ? rule.targetPath : rule.sourcePath;
    const currentRuleTransformation = rule.transformation;
    const currentRuleTransformationType = rule.transformationType;

    if (
      !currentRuleTargetPath ||
      currentRuleTargetPath === "$" ||
      !currentRuleSourcePath ||
      currentRuleSourcePath === "$"
    ) {
      continue;
    }

    try {
      // Case 1: Simple field mapping (no arrays)
      if (
        !currentRuleSourcePath.includes("[*]") &&
        !currentRuleTargetPath.includes("[*]")
      ) {
        let valueToSet = getValueByPath(sourceJson, currentRuleSourcePath);

        if (valueToSet === undefined && currentRuleSourcePath !== "$") {
          continue;
        }

        // Apply transformation if needed
        if (
          direction === "sourceToTarget" &&
          currentRuleTransformationType !== "none"
        ) {
          valueToSet = applyTransformation(
            valueToSet,
            currentRuleTransformation,
            currentRuleTransformationType,
            sourceJson,
          );
        }

        if (valueToSet !== undefined) {
          setValueByPath(outputObject, currentRuleTargetPath, valueToSet);
        }
        continue;
      }

      // Case 2: Array field mapping
      if (
        currentRuleSourcePath.includes("[*]") &&
        currentRuleTargetPath.includes("[*]")
      ) {
        // Extract array container paths and field paths
        const sourceContainerPath = currentRuleSourcePath.substring(
          0,
          currentRuleSourcePath.indexOf("[*]"),
        );
        const sourceFieldPath = currentRuleSourcePath.substring(
          currentRuleSourcePath.indexOf("[*]") + 3,
        );

        const targetContainerPath = currentRuleTargetPath.substring(
          0,
          currentRuleTargetPath.indexOf("[*]"),
        );
        const targetFieldPath = currentRuleTargetPath.substring(
          currentRuleTargetPath.indexOf("[*]") + 3,
        );

        // Get source array
        const sourceArray = getValueByPath(sourceJson, sourceContainerPath);
        if (!Array.isArray(sourceArray)) {
          continue;
        }

        // Case 2a: Array-to-nested-array with join condition
        if (rule.joinCondition) {

          // Count wildcards to detect nested array mapping
          const targetWildcardCount = (currentRuleTargetPath.match(/\[\*\]/g) || []).length;

          if (targetWildcardCount >= 2) {
            // Extract target parent array path (first [*])
            const firstWildcardIndex = currentRuleTargetPath.indexOf("[*]");
            const targetParentPath = currentRuleTargetPath.substring(0, firstWildcardIndex);

            // Get target parent array from output, or copy from source if available
            let targetParentArray = getValueByPath(outputObject, targetParentPath);
            if (!Array.isArray(targetParentArray)) {
              // Try to get it from source
              const targetFromSource = getValueByPath(sourceJson, targetParentPath);
              if (Array.isArray(targetFromSource)) {
                // Deep clone to avoid modifying source
                targetParentArray = JSON.parse(JSON.stringify(targetFromSource));
                setValueByPath(outputObject, targetParentPath, targetParentArray);
              } else {
                continue; // Skip if target parent array doesn't exist anywhere
              }
            }

            // Create Map for O(1) lookup: targetKey -> targetParentItem
            const targetMap = new Map<any, any>();
            const matchType = rule.joinCondition.matchType || "equals";

            for (const targetParentItem of targetParentArray) {
              if (targetParentItem && typeof targetParentItem === "object") {
                const targetKeyValue = targetParentItem[rule.joinCondition.targetKey];
                if (targetKeyValue !== undefined && targetKeyValue !== null) {
                  targetMap.set(targetKeyValue, targetParentItem);
                }
              }
            }

            // Extract target path segments using helper function
            const targetSegments = extractJoinPathSegments(currentRuleTargetPath);
            if (!targetSegments) {
              continue; // Invalid target path format
            }

            const targetNestedArrayPath = targetSegments.nestedArrayName;
            const targetFieldPathForJoin = `['${targetSegments.fieldName}']`;

            // Extract source field path (source only has 1 wildcard)
            const sourceAfterWildcard = currentRuleSourcePath.substring(
              currentRuleSourcePath.indexOf("[*]") + 3
            );
            // Clean up the path - handle both .field and ['field'] formats
            const sourceFieldName = sourceAfterWildcard
              .replace(/^\['/, "")
              .replace(/'\]$/, "")
              .replace(/^\./, "");
            const sourceFieldPathForJoin = `['${sourceFieldName}']`;

            // Track which source items have been mapped to which nested array indices
            // This allows multiple rules to merge into the same nested object
            // Key: sourceKeyValue (e.g., "p1"), Value: nested array index
            const sourceToNestedIndexMap = new Map<any, number>();

            // Pre-scan existing nested arrays to build the map
            for (const targetParentItem of targetParentArray) {
              if (targetParentItem && typeof targetParentItem === "object") {
                const targetKeyValue = targetParentItem[rule.joinCondition.targetKey];
                const existingNestedArray = targetParentItem[targetNestedArrayPath];
                if (Array.isArray(existingNestedArray) && existingNestedArray.length > 0) {
                  // Map this target key to the nested array index 0 (assuming one nested item per match)
                  sourceToNestedIndexMap.set(targetKeyValue, 0);
                }
              }
            }

            // Process each source item and find matching target parent
            for (const sourceItem of sourceArray) {
              if (!sourceItem || typeof sourceItem !== "object") continue;

              // Get join key from source item
              const sourceKeyValue = sourceItem[rule.joinCondition.sourceKey];
              if (sourceKeyValue === undefined || sourceKeyValue === null) continue;

              // Find matching target parent using Map (O(1) lookup)
              let matchingTargetParent: any = null;

              if (matchType === "equals") {
                matchingTargetParent = targetMap.get(sourceKeyValue);
              } else if (matchType === "contains" || matchType === "startsWith") {
                // For non-equals matches, fallback to linear search
                for (const targetParentItem of targetParentArray) {
                  if (targetParentItem && typeof targetParentItem === "object") {
                    const targetKeyValue = targetParentItem[rule.joinCondition.targetKey];
                    if (targetKeyValue !== undefined && targetKeyValue !== null) {
                      const sourceStr = String(sourceKeyValue);
                      const targetStr = String(targetKeyValue);
                      if (matchType === "contains" && targetStr.includes(sourceStr)) {
                        matchingTargetParent = targetParentItem;
                        break;
                      } else if (matchType === "startsWith" && targetStr.startsWith(sourceStr)) {
                        matchingTargetParent = targetParentItem;
                        break;
                      }
                    }
                  }
                }
              }

              if (!matchingTargetParent) {
                // No match found - skip (left join behavior)
                continue;
              }

              // Ensure nested array exists in target parent
              if (!matchingTargetParent[targetNestedArrayPath]) {
                matchingTargetParent[targetNestedArrayPath] = [];
              }

              const targetNestedArray = matchingTargetParent[targetNestedArrayPath];

              // Extract source value
              let sourceValue;
              if (sourceFieldPathForJoin) {
                const pathParts = sourceFieldPathForJoin
                  .replace(/^\['/, "")
                  .replace(/'\]$/, "")
                  .split(/'\]\['|'\.'|'\]\./);

                sourceValue = sourceItem;
                for (const segment of pathParts) {
                  if (!sourceValue || typeof sourceValue !== "object") {
                    sourceValue = undefined;
                    break;
                  }
                  sourceValue = sourceValue[segment];
                }
              } else {
                sourceValue = sourceItem;
              }

              if (sourceValue === undefined) continue;

              // Apply transformation
              let transformedValue = sourceValue;
              if (
                direction === "sourceToTarget" &&
                currentRuleTransformationType !== "none"
              ) {
                transformedValue = applyTransformation(
                  sourceValue,
                  currentRuleTransformation,
                  currentRuleTransformationType,
                  sourceJson,
                );
              }

              // Get or create target nested item
              // Check if we've already created a nested item for this source key
              let nestedItemIndex = sourceToNestedIndexMap.get(sourceKeyValue);
              let targetNestedItem: any;

              if (nestedItemIndex !== undefined && targetNestedArray[nestedItemIndex]) {
                // Reuse existing nested item
                targetNestedItem = targetNestedArray[nestedItemIndex];
              } else {
                // Create new nested item
                targetNestedItem = {};
                nestedItemIndex = targetNestedArray.length;
                sourceToNestedIndexMap.set(sourceKeyValue, nestedItemIndex);
                targetNestedArray.push(targetNestedItem);
              }

              if (targetFieldPathForJoin) {
                // Map to specific field in nested item
                const pathParts = targetFieldPathForJoin
                  .replace(/^\['/, "")
                  .replace(/'\]$/, "")
                  .split(/'\]\['|'\.'|'\]\./);

                let current = targetNestedItem;
                for (let j = 0; j < pathParts.length - 1; j++) {
                  const segment = pathParts[j];
                  if (!segment) continue;
                  if (!current[segment]) {
                    current[segment] = {};
                  }
                  current = current[segment];
                }

                const lastSegment = pathParts[pathParts.length - 1];
                if (lastSegment) {
                  current[lastSegment] = transformedValue;
                }
              } else {
                // Map entire item
                if (typeof transformedValue === "object" && !Array.isArray(transformedValue)) {
                  Object.assign(targetNestedItem, transformedValue);
                } else {
                  targetNestedItem = transformedValue;
                  targetNestedArray[nestedItemIndex] = targetNestedItem;
                }
              }
            }

            // Update modified target parent array
            setValueByPath(outputObject, targetParentPath, targetParentArray);

            continue;
          }
        }

        // Get or create target array (but don't pre-fill with empty objects)
        let targetArray = getValueByPath(outputObject, targetContainerPath);
        if (!targetArray || !Array.isArray(targetArray)) {
          targetArray = [];
          setValueByPath(outputObject, targetContainerPath, targetArray);
        } else {
          // IMPORTANT: Get a fresh reference from outputObject to ensure we're modifying the actual array
          // This fixes the issue where multiple rules modifying the same nested array lose each other's changes
          const freshTargetArray = getValueByPath(outputObject, targetContainerPath);
          if (freshTargetArray && Array.isArray(freshTargetArray)) {
            targetArray = freshTargetArray;
          }
        }

        // Special case: Handle nested array in target path (flat-to-nested or nested-to-nested)
        if (targetFieldPath.includes("[*]")) {

          // Improved extraction of the inner array field names
          // Extract source inner field name and remaining path
          const sourceFieldMatch = sourceFieldPath.match(/^\['([^']+)'\]|\.\['([^']+)'\]|\.([^.\[]+)/);
          const sourceInnerFieldName = sourceFieldMatch
            ? (sourceFieldMatch[1] || sourceFieldMatch[2] || sourceFieldMatch[3])
            : "";

          // Extract the path after the nested array [*] in source
          const sourceNestedFieldPath = sourceFieldPath.includes("[*]")
            ? sourceFieldPath.substring(sourceFieldPath.indexOf("[*]") + 3)
            : "";

          // Extract target path components
          const targetPathParts = targetFieldPath.split(/\[\*\]/);

          // Get the first component (like 'contactMethods' or 'conflicts')
          const firstTargetMatch = targetPathParts[0].match(/^\['([^']+)'\]|\.\['([^']+)'\]|\.([^.\[]+)/);
          const firstTargetComponent = firstTargetMatch
            ? (firstTargetMatch[1] || firstTargetMatch[2] || firstTargetMatch[3])
            : "";

          // Get the last component (like 'value' or 'priority')
          const lastTargetMatch = targetPathParts[1]?.match(/^\['([^']+)'\]|\.\['([^']+)'\]|\.([^.\[]+)/);
          const lastTargetComponent = lastTargetMatch ? (lastTargetMatch[1] || lastTargetMatch[2] || lastTargetMatch[3]) : "";

          // Process each array item
          for (let i = 0; i < sourceArray.length; i++) {
            const sourceItem = sourceArray[i];

            if (!sourceItem || typeof sourceItem !== "object") continue;

            // Case 1: Source has nested array (e.g., contacts[*].phones[*].number)
            // Get the nested array from the source item
            const sourceNestedArray = sourceItem[sourceInnerFieldName];

            if (Array.isArray(sourceNestedArray)) {

              // Create target item if it doesn't exist
              if (!targetArray[i]) {
                targetArray[i] = {};
              }

              // Initialize the container for nested objects if it doesn't exist
              if (!targetArray[i][firstTargetComponent]) {
                targetArray[i][firstTargetComponent] = [];
              }

              // Transform each value in the source nested array into an object in the target
              for (let j = 0; j < sourceNestedArray.length; j++) {
                const nestedSourceItem = sourceNestedArray[j];

                // Extract the actual field value from nested source item
                let nestedSourceValue = nestedSourceItem;
                if (sourceNestedFieldPath) {
                  const nestedPathParts = sourceNestedFieldPath
                    .replace(/^\['/, "")
                    .replace(/'\]$/, "")
                    .replace(/^\./, "")
                    .split(/'\]\['|'\]\.|'\.'|\./);

                  for (const segment of nestedPathParts) {
                    if (!segment) continue;
                    if (nestedSourceValue && typeof nestedSourceValue === "object") {
                      nestedSourceValue = nestedSourceValue[segment];
                    } else {
                      nestedSourceValue = undefined;
                      break;
                    }
                  }
                }

                // Get or create nested target object at this index
                if (!targetArray[i][firstTargetComponent][j]) {
                  targetArray[i][firstTargetComponent][j] = {};
                }
                const targetNestedItem = targetArray[i][firstTargetComponent][j];

                // Set the field value on the nested object
                if (lastTargetComponent && nestedSourceValue !== undefined) {
                  targetNestedItem[lastTargetComponent] = nestedSourceValue;
                } else if (!lastTargetComponent && nestedSourceValue !== undefined) {
                  // If no last component, replace the entire item
                  targetArray[i][firstTargetComponent][j] = nestedSourceValue;
                }
              }
            } else {
              // Case 2: Source does NOT have nested array (e.g., conflicts[*].priority -> products[*].conflicts[*].priority)
              // This is a flat-to-nested array mapping

              // Extract source value (it's a simple field, not a nested array)
              let sourceValue = sourceItem;
              if (sourceFieldPath && !sourceFieldPath.startsWith("[*]")) {
                const pathParts = sourceFieldPath
                  .replace(/^\['/, "")
                  .replace(/'\]$/, "")
                  .replace(/^\./, "")
                  .split(/'\]\['|'\]\.|'\.'|\./);

                for (const segment of pathParts) {
                  if (!segment) continue;
                  if (sourceValue && typeof sourceValue === "object") {
                    sourceValue = sourceValue[segment];
                  } else {
                    sourceValue = undefined;
                    break;
                  }
                }
              }

              if (sourceValue === undefined) continue;

              // Apply transformation
              let transformedValue = sourceValue;
              if (
                direction === "sourceToTarget" &&
                currentRuleTransformationType !== "none"
              ) {
                transformedValue = applyTransformation(
                  sourceValue,
                  currentRuleTransformation,
                  currentRuleTransformationType,
                  sourceJson,
                );
              }

              // Create target item if it doesn't exist
              if (!targetArray[i]) {
                targetArray[i] = {};
              }

              // Initialize the nested array if it doesn't exist
              if (!targetArray[i][firstTargetComponent]) {
                targetArray[i][firstTargetComponent] = [];
              }

              // Get or create nested object at index 0 (since source has no nested array, map to first nested item)
              if (!targetArray[i][firstTargetComponent][0]) {
                targetArray[i][firstTargetComponent][0] = {};
              }

              const targetNestedItem = targetArray[i][firstTargetComponent][0];

              // Set the field value
              if (lastTargetComponent) {
                targetNestedItem[lastTargetComponent] = transformedValue;
              } else {
                targetArray[i][firstTargetComponent][0] = transformedValue;
              }
            }
          }

          // Update the target array in the output object
          setValueByPath(outputObject, targetContainerPath, targetArray);
          continue;
        }

        // Standard array mapping for each item
        for (let i = 0; i < sourceArray.length; i++) {
          const sourceItem = sourceArray[i];

          // Extract the correct field value from the source item
          let sourceValue;
          if (sourceFieldPath) {
            // For nested paths, extract the specific field
            const pathParts = sourceFieldPath
              .replace(/^\['/, "")    // Remove leading ['
              .replace(/'\]$/, "")    // Remove trailing ']
              .replace(/^\./, "")     // Remove leading dot (for dot notation like .field)
              .split(/'\]\['|'\.'|'\]\.|\./)  // Split on bracket/quote/dot separators

            // Navigate to the field
            sourceValue = sourceItem;
            for (const segment of pathParts) {
              if (!segment) continue;  // Skip empty segments
              if (!sourceValue || typeof sourceValue !== "object") {
                sourceValue = undefined;
                break;
              }
              sourceValue = sourceValue[segment];
            }
          } else {
            sourceValue = sourceItem;
          }

          if (sourceValue === undefined) {
            continue;
          }

          // Apply transformation if needed
          let transformedValue = sourceValue;
          if (
            direction === "sourceToTarget" &&
            currentRuleTransformationType !== "none"
          ) {
            transformedValue = applyTransformation(
              sourceValue,
              currentRuleTransformation,
              currentRuleTransformationType,
              sourceJson,
            );
          }

          // Get the existing target item (or create if it doesn't exist and we have a value)
          // Ensure the array can hold this index
          if (!targetArray[i]) {
            targetArray[i] = {};
          }
          let targetItem = targetArray[i];

          // Process field mapping
          if (targetFieldPath) {
            // Parse the target field path
            const pathParts = targetFieldPath
              .replace(/^\['/, "")    // Remove leading ['
              .replace(/'\]$/, "")    // Remove trailing ']
              .replace(/^\./, "")     // Remove leading dot (for dot notation like .field)
              .split(/'\]\['|'\.'|'\]\.|\./)  // Split on bracket/quote/dot separators
              .filter(segment => segment);  // Remove empty segments

            // Build the nested structure
            let current = targetItem;
            for (let j = 0; j < pathParts.length - 1; j++) {
              const segment = pathParts[j];

              if (!current[segment]) {
                current[segment] = {};
              }
              current = current[segment];
            }

            // Set the value on the last segment
            const lastSegment = pathParts[pathParts.length - 1];
            if (lastSegment) {
              current[lastSegment] = transformedValue;
            }
          } else {
            // If no field path, we're replacing the entire item
            // For primitive values, directly assign instead of spreading
            if (transformedValue === null || typeof transformedValue !== "object" || Array.isArray(transformedValue)) {
              targetItem = transformedValue;
            } else {
              // For objects, preserve existing fields and merge
              targetItem = { ...targetItem, ...transformedValue };
            }
          }

          // Update the target array item
          targetArray[i] = targetItem;
        }

        // Update the target array in the output object
        setValueByPath(outputObject, targetContainerPath, targetArray);

        continue;
      }

      // Case 3: Array to scalar mapping
      if (
        currentRuleSourcePath.includes("[*]") &&
        !currentRuleTargetPath.includes("[*]")
      ) {
        const sourceArrayPath = currentRuleSourcePath.substring(
          0,
          currentRuleSourcePath.lastIndexOf("[*]"),
        );
        const sourceArray = getValueByPath(sourceJson, sourceArrayPath);

        if (Array.isArray(sourceArray)) {
          setValueByPath(outputObject, currentRuleTargetPath, sourceArray);
        }
        continue;
      }

      // Case 4: Scalar to array mapping
      if (
        !currentRuleSourcePath.includes("[*]") &&
        currentRuleTargetPath.includes("[*]")
      ) {
        const sourceValue = getValueByPath(sourceJson, currentRuleSourcePath);
        const targetArrayPath = currentRuleTargetPath.substring(
          0,
          currentRuleTargetPath.indexOf("[*]"),
        );

        if (Array.isArray(sourceValue)) {
          setValueByPath(outputObject, targetArrayPath, sourceValue);
        }
        continue;
      }
    } catch (e) {
      const readableFromPath = jsonPathToReadablePath(currentRuleSourcePath);
      const readableToPath = jsonPathToReadablePath(currentRuleTargetPath);
      console.error(
        `Error processing rule ID "${rule.id}" from "${readableFromPath}" to "${readableToPath}":`,
        e,
      );
    }
  }

  // Clean up: Remove empty objects from all arrays in the output
  cleanupEmptyObjects(outputObject);

  return outputObject;
}

/**
 * Recursively removes empty objects from arrays in the object tree.
 * Preserves null values and other valid data types, only removes objects with no properties.
 */
function cleanupEmptyObjects(obj: any): void {
  if (Array.isArray(obj)) {
    // Filter out only empty objects {}, keep null and undefined as they might be intentional
    const filtered = obj.filter((item) => {
      // Keep null and undefined
      if (item === null || item === undefined) {
        return true;
      }
      // Remove empty objects {}
      if (typeof item === 'object' && !Array.isArray(item)) {
        if (Object.keys(item).length === 0) {
          return false;
        }
      }
      return true;
    });

    // Remove items from the original array and replace with filtered
    obj.length = 0;
    obj.push(...filtered);

    // Recursively clean nested structures
    obj.forEach(item => {
      if (item && typeof item === 'object') {
        cleanupEmptyObjects(item);
      }
    });
  } else if (obj && typeof obj === 'object') {
    // Recursively clean all object properties
    Object.values(obj).forEach(value => {
      if (value && typeof value === 'object') {
        cleanupEmptyObjects(value);
      }
    });
  }
}

/**
 * Applies a transformation to a value
 */
export function applyTransformation(
  inputValue: any,
  transformationScript: string,
  type: "none" | "builtin" | "custom",
  entireSourceObject: any,
): any {
  if (type === "none" || !transformationScript) {
    return inputValue;
  }

  try {
    if (type === "builtin") {
      return applyBuiltinTransformation(inputValue, transformationScript);
    } else if (type === "custom") {
      const paramNames = ["sourceValue", "sourceObject"];
      const functionBody = `"use strict"; return (${transformationScript});`;
      const transformFn = new Function(...paramNames, functionBody);

      const result = transformFn(inputValue, entireSourceObject);
      return result;
    }
    return inputValue;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error applying transformation (Type: ${type}, Script: "${transformationScript}", Input: ${JSON.stringify(inputValue)}): ${errorMessage}`,
    );
    throw new Error(
      `Transformation Error: ${errorMessage} (Script: "${transformationScript}")`,
    );
  }
}

/**
 * Applies a built-in transformation to a value
 */
export function applyBuiltinTransformation(
  value: any,
  transformation: string,
): any {
  const [funcName, ...args] = transformation.split("(");
  const argsStr = args.join("(").replace(/\)$/, "");
  const parsedArgs = argsStr
    ? argsStr.split(",").map((arg) => arg.trim().replace(/['"]/g, ""))
    : [];

  switch (funcName.trim()) {
    // String transformations
    case "toUpperCase":
      return String(value).toUpperCase();
    case "toLowerCase":
      return String(value).toLowerCase();
    case "capitalize":
      const str = String(value);
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    case "trim":
      return String(value).trim();
    case "substring":
      return String(value).substring(
        parseInt(parsedArgs[0] || "0"),
        parsedArgs[1] ? parseInt(parsedArgs[1]) : undefined,
      );
    case "append":
      const appendText = argsStr.replace(/['"]/g, "");
      return String(value) + appendText;
    case "prepend":
      const prependText = argsStr.replace(/['"]/g, "");
      return prependText + String(value);
    case "length":
      return Array.isArray(value) || typeof value === "string"
        ? value.length
        : 0;

    // Type casts
    case "toNumber":
      return Number(value);
    case "toString":
      return String(value);
    case "toBoolean":
      return Boolean(value);

    // Number transformations
    case "round":
      return Math.round(Number(value));
    case "floor":
      return Math.floor(Number(value));
    case "ceil":
      return Math.ceil(Number(value));
    case "toFixed":
      const decimals = parseInt(parsedArgs[0] || "0");
      return Number(value).toFixed(decimals);
    case "add":
      return Number(value) + Number(parsedArgs[0] || 0);
    case "subtract":
      return Number(value) - Number(parsedArgs[0] || 0);
    case "multiply":
      return Number(value) * Number(parsedArgs[0] || 1);
    case "divide":
      const divisor = Number(parsedArgs[0] || 1);
      return divisor !== 0 ? Number(value) / divisor : value;

    // Boolean/logical transformations
    case "not":
      return !value;
    case "isEmpty":
      return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    case "isNull":
      return value === null || value === undefined;

    // Utility transformations
    case "default":
      const defaultValue = parsedArgs[0] || "";
      return value === null || value === undefined ? defaultValue : value;

    // Date transformations
    case "formatDate":
      // Simple date formatting, could be expanded
      const date = new Date(value);
      return date.toISOString();
    case "toTimestamp":
      return new Date(value).getTime();

    // Array transformations
    case "join":
      const joinSeparator = argsStr.replace(/['"]/g, "") || ",";
      return Array.isArray(value) ? value.join(joinSeparator) : value;
    case "firstElement":
      return Array.isArray(value) && value.length > 0 ? value[0] : null;
    case "lastElement":
      return Array.isArray(value) && value.length > 0
        ? value[value.length - 1]
        : null;

    default:
      return value;
  }
}

/**
 * Validates mapping rules against source and target JSON
 */
export function validateRules(
  rules: MappingRule[],
  sourceJson: any,
  targetJson: any,
): MappingRule[] {
  return rules.map((rule) => {
    try {
      // Check if source path exists
      const sourceValue = getValueByPath(sourceJson, rule.sourcePath);
      const sourceExists = sourceValue !== undefined;

      // Check if target path exists
      const targetValue = getValueByPath(targetJson, rule.targetPath);
      const targetExists = targetValue !== undefined;

      // Update data types
      const sourceDataType = sourceExists
        ? getDataType(sourceValue)
        : "unknown";
      const targetDataType = targetExists
        ? getDataType(targetValue)
        : "unknown";

      // Determine status
      let status: MappingStatus = "mapped";

      if (rule.status === "ignored") {
        status = "ignored";
      } else if (!sourceExists || !targetExists) {
        status = "unmapped";
      } else if (
        sourceDataType !== targetDataType &&
        sourceDataType !== "unknown" &&
        targetDataType !== "unknown"
      ) {
        // Type mismatch, but allow if one is unknown
        status = "error";
      }

      return {
        ...rule,
        sourceDataType,
        targetDataType,
        status,
      };
    } catch (error) {
      console.error("Error validating rule:", error);
      return {
        ...rule,
        status: "error",
      };
    }
  });
}

/**
 * Generates code for a mapping
 */
export function generateCode(
  rules: MappingRule[],
  language: TargetLanguage,
  direction: MappingDirection,
): string {
  // Filter out ignored rules
  const activeRules = rules.filter((rule) => rule.status !== "ignored");

  // Determine source and target variable names based on direction
  const sourceVar = direction === "sourceToTarget" ? "source" : "target";
  const targetVar = direction === "sourceToTarget" ? "target" : "source";

  switch (language) {
    case "javascript":
      return generateJavaScriptCode(activeRules, sourceVar, targetVar);
    case "typescript":
      return generateTypeScriptCode(activeRules, sourceVar, targetVar);
    case "python":
      return generatePythonCode(activeRules, sourceVar, targetVar);
    case "java":
      return generateJavaCode(activeRules, sourceVar, targetVar);
    default:
      return generateJavaScriptCode(activeRules, sourceVar, targetVar);
  }
}

/**
 * Generates JavaScript code for a mapping
 */
function generateJavaScriptCode(
  rules: MappingRule[],
  sourceVar: string,
  targetVar: string,
): string {
  let code = `/**
 * Transforms ${sourceVar} object to ${targetVar} object
 * @param {Object} ${sourceVar} - The source object
 * @return {Object} The transformed ${targetVar} object
 */
function transform(${sourceVar}) {
  const ${targetVar} = {};
  
  try {
`;

  // Helper function to get a value by path
  code += `    // Helper function to get a value by path
    const getValueByPath = (obj, path) => {
      try {
        // Handle root path
        if (path === '$') return obj;
        
        // Remove $ prefix if present
        const normalizedPath = path.startsWith('$') ? path.substring(1) : path;
        
        // Split path into parts
        const parts = normalizedPath.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/g);
        
        if (!parts) return undefined;
        
        let current = obj;
        for (const part of parts) {
          const match = part.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
          if (!match) continue;
          
          const key = match[1] || match[2];
          current = current[key];
          
          if (current === undefined || current === null) {
            return undefined;
          }
        }
        
        return current;
      } catch (error) {
        console.error('Error getting value by path:', error);
        return undefined;
      }
    };
    
    // Helper function to set a value by path
    const setValueByPath = (obj, path, value) => {
      try {
        // Handle root path
        if (path === '$') return value;
        
        // Remove $ prefix if present
        const normalizedPath = path.startsWith('$') ? path.substring(1) : path;
        
        // Split path into parts
        const parts = normalizedPath.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/g);
        
        if (!parts) return obj;
        
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const match = parts[i].match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
          if (!match) continue;
          
          const key = match[1] || match[2];
          
          // Create nested objects/arrays if they don't exist
          if (current[key] === undefined) {
            const nextPart = parts[i + 1];
            const isNextPartArray = nextPart && /\\[(\\d+)\\]/.test(nextPart);
            current[key] = isNextPartArray ? [] : {};
          }
          
          current = current[key];
        }
        
        // Set the value on the last part
        const lastPart = parts[parts.length - 1];
        const match = lastPart.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
        if (match) {
          const key = match[1] || match[2];
          current[key] = value;
        }
        
        return obj;
      } catch (error) {
        console.error('Error setting value by path:', error);
        return obj;
      }
    };
    
`;

  // Add transformation code for each rule
  for (const rule of rules) {
    const fromPath = sourceVar === "source" ? rule.sourcePath : rule.targetPath;
    const toPath = sourceVar === "source" ? rule.targetPath : rule.sourcePath;

    code += `    // Map ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}\n`;
    code += `    try {\n`;
    code += `      const sourceValue = getValueByPath(${sourceVar}, "${fromPath}");\n`;

    // Add transformation if specified
    if (
      rule.transformationType !== "none" &&
      rule.transformation &&
      sourceVar === "source"
    ) {
      if (rule.transformationType === "builtin") {
        code += `      // Apply built-in transformation: ${rule.transformation}\n`;
        code += `      let transformedValue;\n`;

        // Handle different built-in transformations
        const [funcName, ...args] = rule.transformation.split("(");
        const argsStr = args.join("(").replace(/\)$/, "");

        switch (funcName.trim()) {
          case "toUpperCase":
            code += `      transformedValue = String(sourceValue).toUpperCase();\n`;
            break;
          case "toLowerCase":
            code += `      transformedValue = String(sourceValue).toLowerCase();\n`;
            break;
          case "capitalize":
            code += `      transformedValue = String(sourceValue).charAt(0).toUpperCase() + String(sourceValue).slice(1).toLowerCase();\n`;
            break;
          case "trim":
            code += `      transformedValue = String(sourceValue).trim();\n`;
            break;
          case "substring":
            const substringArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = String(sourceValue).substring(${substringArgs.join(", ")});\n`;
            break;
          case "append":
            const appendText = argsStr.replace(/['"]/g, "");
            code += `      transformedValue = String(sourceValue) + "${appendText}";\n`;
            break;
          case "prepend":
            const prependText = argsStr.replace(/['"]/g, "");
            code += `      transformedValue = "${prependText}" + String(sourceValue);\n`;
            break;
          case "length":
            code += `      transformedValue = (Array.isArray(sourceValue) || typeof sourceValue === 'string') ? sourceValue.length : 0;\n`;
            break;
          case "toNumber":
            code += `      transformedValue = Number(sourceValue);\n`;
            break;
          case "toString":
            code += `      transformedValue = String(sourceValue);\n`;
            break;
          case "toBoolean":
            code += `      transformedValue = Boolean(sourceValue);\n`;
            break;
          case "round":
            code += `      transformedValue = Math.round(Number(sourceValue));\n`;
            break;
          case "floor":
            code += `      transformedValue = Math.floor(Number(sourceValue));\n`;
            break;
          case "ceil":
            code += `      transformedValue = Math.ceil(Number(sourceValue));\n`;
            break;
          case "toFixed":
            const fixedArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue).toFixed(${fixedArgs[0] || "0"});\n`;
            break;
          case "add":
            const addArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) + Number(${addArgs[0] || "0"});\n`;
            break;
          case "subtract":
            const subtractArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) - Number(${subtractArgs[0] || "0"});\n`;
            break;
          case "multiply":
            const multiplyArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) * Number(${multiplyArgs[0] || "1"});\n`;
            break;
          case "divide":
            const divideArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      const divisor = Number(${divideArgs[0] || "1"});\n`;
            code += `      transformedValue = divisor !== 0 ? Number(sourceValue) / divisor : sourceValue;\n`;
            break;
          case "not":
            code += `      transformedValue = !sourceValue;\n`;
            break;
          case "isEmpty":
            code += `      transformedValue = sourceValue === null || sourceValue === undefined || sourceValue === '' || (Array.isArray(sourceValue) && sourceValue.length === 0);\n`;
            break;
          case "isNull":
            code += `      transformedValue = sourceValue === null || sourceValue === undefined;\n`;
            break;
          case "default":
            const defaultArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = sourceValue === null || sourceValue === undefined ? "${defaultArgs[0] || ""}" : sourceValue;\n`;
            break;
          case "formatDate":
            code += `      transformedValue = new Date(sourceValue).toISOString();\n`;
            break;
          case "toTimestamp":
            code += `      transformedValue = new Date(sourceValue).getTime();\n`;
            break;
          case "join":
            const joinSeparator = argsStr.replace(/['"]/g, "") || ",";
            code += `      transformedValue = Array.isArray(sourceValue) ? sourceValue.join("${joinSeparator}") : sourceValue;\n`;
            break;
          case "firstElement":
            code += `      transformedValue = Array.isArray(sourceValue) && sourceValue.length > 0 ? sourceValue[0] : null;\n`;
            break;
          case "lastElement":
            code += `      transformedValue = Array.isArray(sourceValue) && sourceValue.length > 0 ? sourceValue[sourceValue.length - 1] : null;\n`;
            break;
          default:
            code += `      transformedValue = sourceValue; // Unknown transformation: ${rule.transformation}\n`;
        }
      } else if (rule.transformationType === "custom") {
        code += `      // Apply custom transformation\n`;
        code += `      const transformFn = (sourceValue, sourceObject) => {\n`;
        code += `        return ${rule.transformation};\n`;
        code += `      };\n`;
        code += `      const transformedValue = transformFn(sourceValue, ${sourceVar});\n`;
      }

      code += `      if (transformedValue !== undefined) {\n`;
      code += `        setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
      code += `      }\n`;
    } else {
      code += `      if (sourceValue !== undefined) {\n`;
      code += `        setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
      code += `      }\n`;
    }

    code += `    } catch (error) {\n`;
    code += `      console.error("Error mapping ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}:", error);\n`;
    code += `    }\n\n`;
  }

  code += `    return ${targetVar};\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error("Error during transformation:", error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n`;

  return code;
}

/**
 * Generates TypeScript code for a mapping
 */
function generateTypeScriptCode(
  rules: MappingRule[],
  sourceVar: string,
  targetVar: string,
): string {
  let code = `/**
 * Transforms ${sourceVar} object to ${targetVar} object
 * @param ${sourceVar} - The source object
 * @return The transformed ${targetVar} object
 */
function transform(${sourceVar}: any): any {
  const ${targetVar}: any = {};
  
  try {
`;

  // The rest is similar to JavaScript but with type annotations
  // Helper function to get a value by path
  code += `    // Helper function to get a value by path
    const getValueByPath = (obj: any, path: string): any => {
      try {
        // Handle root path
        if (path === '$') return obj;
        
        // Remove $ prefix if present
        const normalizedPath = path.startsWith('$') ? path.substring(1) : path;
        
        // Split path into parts
        const parts = normalizedPath.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/g);
        
        if (!parts) return undefined;
        
        let current = obj;
        for (const part of parts) {
          const match = part.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
          if (!match) continue;
          
          const key = match[1] || match[2];
          current = current[key];
          
          if (current === undefined || current === null) {
            return undefined;
          }
        }
        
        return current;
      } catch (error) {
        console.error('Error getting value by path:', error);
        return undefined;
      }
    };
    
    // Helper function to set a value by path
    const setValueByPath = (obj: any, path: string, value: any): any => {
      try {
        // Handle root path
        if (path === '$') return value;
        
        // Remove $ prefix if present
        const normalizedPath = path.startsWith('$') ? path.substring(1) : path;
        
        // Split path into parts
        const parts = normalizedPath.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/g);
        
        if (!parts) return obj;
        
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const match = parts[i].match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
          if (!match) continue;
          
          const key = match[1] || match[2];
          
          // Create nested objects/arrays if they don't exist
          if (current[key] === undefined) {
            const nextPart = parts[i + 1];
            const isNextPartArray = nextPart && /\\[(\\d+)\\]/.test(nextPart);
            current[key] = isNextPartArray ? [] : {};
          }
          
          current = current[key];
        }
        
        // Set the value on the last part
        const lastPart = parts[parts.length - 1];
        const match = lastPart.match(/\\['([^']+)'\\]|\\[(\\d+)\\]/);
        if (match) {
          const key = match[1] || match[2];
          current[key] = value;
        }
        
        return obj;
      } catch (error) {
        console.error('Error setting value by path:', error);
        return obj;
      }
    };
    
`;

  // Add transformation code for each rule
  for (const rule of rules) {
    const fromPath = sourceVar === "source" ? rule.sourcePath : rule.targetPath;
    const toPath = sourceVar === "source" ? rule.targetPath : rule.sourcePath;

    code += `    // Map ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}\n`;
    code += `    try {\n`;
    code += `      const sourceValue = getValueByPath(${sourceVar}, "${fromPath}");\n`;

    // Add transformation if specified
    if (
      rule.transformationType !== "none" &&
      rule.transformation &&
      sourceVar === "source"
    ) {
      if (rule.transformationType === "builtin") {
        code += `      // Apply built-in transformation: ${rule.transformation}\n`;
        code += `      let transformedValue: any;\n`;

        // Handle different built-in transformations
        const [funcName, ...args] = rule.transformation.split("(");
        const argsStr = args.join("(").replace(/\)$/, "");

        switch (funcName.trim()) {
          case "toUpperCase":
            code += `      transformedValue = String(sourceValue).toUpperCase();\n`;
            break;
          case "toLowerCase":
            code += `      transformedValue = String(sourceValue).toLowerCase();\n`;
            break;
          case "capitalize":
            code += `      transformedValue = String(sourceValue).charAt(0).toUpperCase() + String(sourceValue).slice(1).toLowerCase();\n`;
            break;
          case "trim":
            code += `      transformedValue = String(sourceValue).trim();\n`;
            break;
          case "substring":
            const substringArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = String(sourceValue).substring(${substringArgs.join(", ")});\n`;
            break;
          case "append":
            const appendText = argsStr.replace(/['"]/g, "");
            code += `      transformedValue = String(sourceValue) + "${appendText}";\n`;
            break;
          case "prepend":
            const prependText = argsStr.replace(/['"]/g, "");
            code += `      transformedValue = "${prependText}" + String(sourceValue);\n`;
            break;
          case "length":
            code += `      transformedValue = (Array.isArray(sourceValue) || typeof sourceValue === 'string') ? sourceValue.length : 0;\n`;
            break;
          case "toNumber":
            code += `      transformedValue = Number(sourceValue);\n`;
            break;
          case "toString":
            code += `      transformedValue = String(sourceValue);\n`;
            break;
          case "toBoolean":
            code += `      transformedValue = Boolean(sourceValue);\n`;
            break;
          case "round":
            code += `      transformedValue = Math.round(Number(sourceValue));\n`;
            break;
          case "floor":
            code += `      transformedValue = Math.floor(Number(sourceValue));\n`;
            break;
          case "ceil":
            code += `      transformedValue = Math.ceil(Number(sourceValue));\n`;
            break;
          case "toFixed":
            const fixedArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue).toFixed(${fixedArgs[0] || "0"});\n`;
            break;
          case "add":
            const addArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) + Number(${addArgs[0] || "0"});\n`;
            break;
          case "subtract":
            const subtractArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) - Number(${subtractArgs[0] || "0"});\n`;
            break;
          case "multiply":
            const multiplyArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = Number(sourceValue) * Number(${multiplyArgs[0] || "1"});\n`;
            break;
          case "divide":
            const divideArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      const divisor = Number(${divideArgs[0] || "1"});\n`;
            code += `      transformedValue = divisor !== 0 ? Number(sourceValue) / divisor : sourceValue;\n`;
            break;
          case "not":
            code += `      transformedValue = !sourceValue;\n`;
            break;
          case "isEmpty":
            code += `      transformedValue = sourceValue === null || sourceValue === undefined || sourceValue === '' || (Array.isArray(sourceValue) && sourceValue.length === 0);\n`;
            break;
          case "isNull":
            code += `      transformedValue = sourceValue === null || sourceValue === undefined;\n`;
            break;
          case "default":
            const defaultArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `      transformedValue = sourceValue === null || sourceValue === undefined ? "${defaultArgs[0] || ""}" : sourceValue;\n`;
            break;
          case "formatDate":
            code += `      transformedValue = new Date(sourceValue).toISOString();\n`;
            break;
          case "toTimestamp":
            code += `      transformedValue = new Date(sourceValue).getTime();\n`;
            break;
          case "join":
            const joinSeparator = argsStr.replace(/['"]/g, "") || ",";
            code += `      transformedValue = Array.isArray(sourceValue) ? sourceValue.join("${joinSeparator}") : sourceValue;\n`;
            break;
          case "firstElement":
            code += `      transformedValue = Array.isArray(sourceValue) && sourceValue.length > 0 ? sourceValue[0] : null;\n`;
            break;
          case "lastElement":
            code += `      transformedValue = Array.isArray(sourceValue) && sourceValue.length > 0 ? sourceValue[sourceValue.length - 1] : null;\n`;
            break;
          default:
            code += `      transformedValue = sourceValue; // Unknown transformation: ${rule.transformation}\n`;
        }
      } else if (rule.transformationType === "custom") {
        code += `      // Apply custom transformation\n`;
        code += `      const transformFn = (sourceValue: any, sourceObject: any): any => {\n`;
        code += `        return ${rule.transformation};\n`;
        code += `      };\n`;
        code += `      const transformedValue = transformFn(sourceValue, ${sourceVar});\n`;
      }

      code += `      if (transformedValue !== undefined) {\n`;
      code += `        setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
      code += `      }\n`;
    } else {
      code += `      if (sourceValue !== undefined) {\n`;
      code += `        setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
      code += `      }\n`;
    }

    code += `    } catch (error) {\n`;
    code += `      console.error("Error mapping ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}:", error);\n`;
    code += `    }\n\n`;
  }

  code += `    return ${targetVar};\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error("Error during transformation:", error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n`;

  return code;
}

/**
 * Generates Python code for a mapping
 */
function generatePythonCode(
  rules: MappingRule[],
  sourceVar: string,
  targetVar: string,
): string {
  let code = `import json
import re
from datetime import datetime
from typing import Any, Dict, List, Union

def transform(${sourceVar}):
    """
    Transforms ${sourceVar} object to ${targetVar} object
    
    Args:
        ${sourceVar}: The source object
        
    Returns:
        The transformed ${targetVar} object
    """
    ${targetVar} = {}
    
    try:
        # Helper function to get a value by path
        def get_value_by_path(obj, path):
            try:
                # Handle root path
                if path == '$':
                    return obj
                
                # Remove $ prefix if present
                normalized_path = path[1:] if path.startswith('$') else path
                
                # Split path into parts
                parts = re.findall(r"\\['([^']+)'\\]|\\[(\\d+)\\]", normalized_path)
                
                if not parts:
                    return None
                
                current = obj
                for part in parts:
                    key = part[0] or part[1]  # Either named key or array index
                    
                    if key.isdigit():  # Array index
                        key = int(key)
                    
                    if isinstance(current, dict) and key in current:
                        current = current[key]
                    elif isinstance(current, list) and isinstance(key, int) and 0 <= key < len(current):
                        current = current[key]
                    else:
                        return None
                
                return current
            except Exception as e:
                print(f"Error getting value by path: {e}")
                return None
        
        # Helper function to set a value by path
        def set_value_by_path(obj, path, value):
            try:
                # Handle root path
                if path == '$':
                    return value
                
                # Remove $ prefix if present
                normalized_path = path[1:] if path.startswith('$') else path
                
                # Split path into parts
                parts = re.findall(r"\\['([^']+)'\\]|\\[(\\d+)\\]", normalized_path)
                
                if not parts:
                    return obj
                
                current = obj
                for i in range(len(parts) - 1):
                    key = parts[i][0] or parts[i][1]  # Either named key or array index
                    
                    if key.isdigit():  # Array index
                        key = int(key)
                    
                    # Create nested objects/arrays if they don't exist
                    if isinstance(current, dict):
                        if key not in current:
                            # Check if next part is an array index
                            next_part = parts[i + 1][1] if i + 1 < len(parts) and parts[i + 1][1] else None
                            current[key] = [] if next_part and next_part.isdigit() else {}
                    elif isinstance(current, list):
                        while len(current) <= key:
                            current.append({})
                    
                    current = current[key]
                
                # Set the value on the last part
                last_key = parts[-1][0] or parts[-1][1]
                if last_key.isdigit():
                    last_key = int(last_key)
                
                if isinstance(current, dict):
                    current[last_key] = value
                elif isinstance(current, list):
                    while len(current) <= last_key:
                        current.append(None)
                    current[last_key] = value
                
                return obj
            except Exception as e:
                print(f"Error setting value by path: {e}")
                return obj
`;

  // Add transformation code for each rule
  for (const rule of rules) {
    const fromPath = sourceVar === "source" ? rule.sourcePath : rule.targetPath;
    const toPath = sourceVar === "source" ? rule.targetPath : rule.sourcePath;

    code += `
        # Map ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}
        try:
            source_value = get_value_by_path(${sourceVar}, "${fromPath}")
            
            if source_value is not None:
`;

    // Add transformation if specified
    if (
      rule.transformationType !== "none" &&
      rule.transformation &&
      sourceVar === "source"
    ) {
      if (rule.transformationType === "builtin") {
        code += `                # Apply built-in transformation: ${rule.transformation}\n`;

        // Handle different built-in transformations
        const [funcName, ...args] = rule.transformation.split("(");
        const argsStr = args.join("(").replace(/\)$/, "");

        switch (funcName.trim()) {
          case "toUpperCase":
            code += `                transformed_value = str(source_value).upper()\n`;
            break;
          case "toLowerCase":
            code += `                transformed_value = str(source_value).lower()\n`;
            break;
          case "capitalize":
            code += `                source_str = str(source_value)\n`;
            code += `                transformed_value = source_str[0].upper() + source_str[1:].lower() if source_str else ""\n`;
            break;
          case "trim":
            code += `                transformed_value = str(source_value).strip()\n`;
            break;
          case "substring":
            const substringArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            if (substringArgs.length === 1) {
              code += `                transformed_value = str(source_value)[${substringArgs[0]}:]\n`;
            } else if (substringArgs.length >= 2) {
              code += `                transformed_value = str(source_value)[${substringArgs[0]}:${substringArgs[1]}]\n`;
            } else {
              code += `                transformed_value = str(source_value)\n`;
            }
            break;
          case "append":
            const appendText = argsStr.replace(/['"]/g, "");
            code += `                transformed_value = str(source_value) + "${appendText}"\n`;
            break;
          case "prepend":
            const prependText = argsStr.replace(/['"]/g, "");
            code += `                transformed_value = "${prependText}" + str(source_value)\n`;
            break;
          case "length":
            code += `                transformed_value = len(source_value) if isinstance(source_value, (str, list)) else 0\n`;
            break;
          case "toNumber":
            code += `                transformed_value = float(source_value)\n`;
            break;
          case "toString":
            code += `                transformed_value = str(source_value)\n`;
            break;
          case "toBoolean":
            code += `                transformed_value = bool(source_value)\n`;
            break;
          case "round":
            code += `                transformed_value = round(float(source_value))\n`;
            break;
          case "floor":
            code += `                import math\n`;
            code += `                transformed_value = math.floor(float(source_value))\n`;
            break;
          case "ceil":
            code += `                import math\n`;
            code += `                transformed_value = math.ceil(float(source_value))\n`;
            break;
          case "toFixed":
            const fixedArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                transformed_value = f"{float(source_value):.${fixedArgs[0] || "0"}f}"\n`;
            break;
          case "add":
            const addArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                transformed_value = float(source_value) + float(${addArgs[0] || "0"})\n`;
            break;
          case "subtract":
            const subtractArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                transformed_value = float(source_value) - float(${subtractArgs[0] || "0"})\n`;
            break;
          case "multiply":
            const multiplyArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                transformed_value = float(source_value) * float(${multiplyArgs[0] || "1"})\n`;
            break;
          case "divide":
            const divideArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                divisor = float(${divideArgs[0] || "1"})\n`;
            code += `                transformed_value = float(source_value) / divisor if divisor != 0 else source_value\n`;
            break;
          case "not":
            code += `                transformed_value = not source_value\n`;
            break;
          case "isEmpty":
            code += `                transformed_value = source_value is None or source_value == "" or (isinstance(source_value, list) and len(source_value) == 0)\n`;
            break;
          case "isNull":
            code += `                transformed_value = source_value is None\n`;
            break;
          case "default":
            const defaultArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                transformed_value = source_value if source_value is not None else "${defaultArgs[0] || ""}"\n`;
            break;
          case "formatDate":
            code += `                transformed_value = datetime.fromisoformat(source_value.replace('Z', '+00:00')).isoformat()\n`;
            break;
          case "toTimestamp":
            code += `                import time\n`;
            code += `                transformed_value = int(time.mktime(datetime.fromisoformat(source_value.replace('Z', '+00:00')).timetuple()) * 1000)\n`;
            break;
          case "join":
            const joinSeparator = argsStr.replace(/['"]/g, "") || ",";
            code += `                transformed_value = "${joinSeparator}".join(map(str, source_value)) if isinstance(source_value, list) else source_value\n`;
            break;
          case "firstElement":
            code += `                transformed_value = source_value[0] if isinstance(source_value, list) and len(source_value) > 0 else None\n`;
            break;
          case "lastElement":
            code += `                transformed_value = source_value[-1] if isinstance(source_value, list) and len(source_value) > 0 else None\n`;
            break;
          default:
            code += `                transformed_value = source_value  # Unknown transformation: ${rule.transformation}\n`;
        }
      } else if (rule.transformationType === "custom") {
        code += `                # Apply custom transformation\n`;
        code += `                # Note: Custom JavaScript transformations are converted to Python\n`;
        code += `                # This is a best-effort conversion and may need manual adjustment\n`;

        // Convert the JavaScript transformation to Python (very basic conversion)
        const pythonTransformation = rule.transformation
          .replace(/===|!==|==|!=|&&|\|\|/g, (match) => {
            switch (match) {
              case "===":
                return "==";
              case "!==":
                return "!=";
              case "==":
                return "==";
              case "!=":
                return "!=";
              case "&&":
                return "and";
              case "||":
                return "or";
              default:
                return match;
            }
          })
          .replace(/null/g, "None")
          .replace(/undefined/g, "None")
          .replace(/true/g, "True")
          .replace(/false/g, "False")
          .replace(/(\w+)\.length/g, "len($1)")
          .replace(/(\w+)\.map\(/g, "list(map(lambda x: ")
          .replace(/(\w+)\.filter\(/g, "list(filter(lambda x: ")
          .replace(/(\w+)\.join\(/g, '".join($1')
          .replace(/\.toUpperCase\(\)/g, ".upper()")
          .replace(/\.toLowerCase\(\)/g, ".lower()")
          .replace(/\.trim\(\)/g, ".strip()");

        code += `                # Warning: This is an auto-converted JavaScript transformation\n`;
        code += `                transformed_value = ${pythonTransformation}\n`;
      }

      code += `                set_value_by_path(${targetVar}, "${toPath}", transformed_value)\n`;
    } else {
      code += `                set_value_by_path(${targetVar}, "${toPath}", source_value)\n`;
    }

    code += `        except Exception as e:
            print(f"Error mapping ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}: {e}")
`;
  }

  code += `
        return ${targetVar}
    except Exception as e:
        print(f"Error during transformation: {e}")
        raise e

# Example usage:
# result = transform(${sourceVar}_data)
`;

  return code;
}

/**
 * Generates Java code for a mapping
 */
function generateJavaCode(
  rules: MappingRule[],
  sourceVar: string,
  targetVar: string,
): string {
  let code = `import java.util.*;
import java.time.*;
import java.time.format.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.core.*;

/**
 * JSON Mapper utility class
 */
public class JsonMapper {
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Transforms ${sourceVar} object to ${targetVar} object
     * 
     * @param ${sourceVar}Json The source JSON string
     * @return The transformed ${targetVar} JSON string
     * @throws Exception If transformation fails
     */
    public static String transform(String ${sourceVar}Json) throws Exception {
        // Parse input JSON
        JsonNode ${sourceVar} = objectMapper.readTree(${sourceVar}Json);
        
        // Create output object
        ObjectNode ${targetVar} = objectMapper.createObjectNode();
        
        try {
`;

  // Add transformation code for each rule
  for (const rule of rules) {
    const fromPath = sourceVar === "source" ? rule.sourcePath : rule.targetPath;
    const toPath = sourceVar === "source" ? rule.targetPath : rule.sourcePath;

    code += `            // Map ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}\n`;
    code += `            try {\n`;
    code += `                JsonNode sourceValue = getValueByPath(${sourceVar}, "${fromPath}");\n`;
    code += `                if (sourceValue != null && !sourceValue.isMissingNode()) {\n`;

    // Add transformation if specified
    if (
      rule.transformationType !== "none" &&
      rule.transformation &&
      sourceVar === "source"
    ) {
      if (rule.transformationType === "builtin") {
        code += `                    // Apply built-in transformation: ${rule.transformation}\n`;

        // Handle different built-in transformations
        const [funcName, ...args] = rule.transformation.split("(");
        const argsStr = args.join("(").replace(/\)$/, "");

        switch (funcName.trim()) {
          case "toUpperCase":
            code += `                    String transformedValue = sourceValue.asText().toUpperCase();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toLowerCase":
            code += `                    String transformedValue = sourceValue.asText().toLowerCase();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "capitalize":
            code += `                    String sourceStr = sourceValue.asText();\n`;
            code += `                    String transformedValue = sourceStr.isEmpty() ? "" : sourceStr.substring(0, 1).toUpperCase() + sourceStr.substring(1).toLowerCase();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "trim":
            code += `                    String transformedValue = sourceValue.asText().trim();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "substring":
            const substringArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            if (substringArgs.length === 1) {
              code += `                    String transformedValue = sourceValue.asText().substring(${substringArgs[0]});\n`;
            } else if (substringArgs.length >= 2) {
              code += `                    String transformedValue = sourceValue.asText().substring(${substringArgs[0]}, ${substringArgs[1]});\n`;
            } else {
              code += `                    String transformedValue = sourceValue.asText();\n`;
            }
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "append":
            const appendText = argsStr.replace(/['"]/g, "");
            code += `                    String transformedValue = sourceValue.asText() + "${appendText}";\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "prepend":
            const prependText = argsStr.replace(/['"]/g, "");
            code += `                    String transformedValue = "${prependText}" + sourceValue.asText();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "length":
            code += `                    int transformedValue;\n`;
            code += `                    if (sourceValue.isArray()) {\n`;
            code += `                        transformedValue = sourceValue.size();\n`;
            code += `                    } else if (sourceValue.isTextual()) {\n`;
            code += `                        transformedValue = sourceValue.asText().length();\n`;
            code += `                    } else {\n`;
            code += `                        transformedValue = 0;\n`;
            code += `                    }\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toNumber":
            code += `                    double transformedValue = sourceValue.asDouble();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toString":
            code += `                    String transformedValue = sourceValue.asText();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toBoolean":
            code += `                    boolean transformedValue = sourceValue.asBoolean();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "round":
            code += `                    long transformedValue = Math.round(sourceValue.asDouble());\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "floor":
            code += `                    double transformedValue = Math.floor(sourceValue.asDouble());\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "ceil":
            code += `                    double transformedValue = Math.ceil(sourceValue.asDouble());\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toFixed":
            const fixedArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    String transformedValue = String.format("%.${fixedArgs[0] || "0"}f", sourceValue.asDouble());\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "add":
            const addArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    double transformedValue = sourceValue.asDouble() + ${addArgs[0] || "0"};\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "subtract":
            const subtractArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    double transformedValue = sourceValue.asDouble() - ${subtractArgs[0] || "0"};\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "multiply":
            const multiplyArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    double transformedValue = sourceValue.asDouble() * ${multiplyArgs[0] || "1"};\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "divide":
            const divideArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    double divisor = ${divideArgs[0] || "1"};\n`;
            code += `                    double transformedValue = divisor != 0 ? sourceValue.asDouble() / divisor : sourceValue.asDouble();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "not":
            code += `                    boolean transformedValue = !sourceValue.asBoolean();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "isEmpty":
            code += `                    boolean transformedValue = sourceValue.isMissingNode() || sourceValue.isNull() || \n`;
            code += `                        (sourceValue.isTextual() && sourceValue.asText().isEmpty()) || \n`;
            code += `                        (sourceValue.isArray() && sourceValue.size() == 0);\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "isNull":
            code += `                    boolean transformedValue = sourceValue.isMissingNode() || sourceValue.isNull();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "default":
            const defaultArgs = argsStr
              .split(",")
              .map((a) => a.trim().replace(/['"]/g, ""));
            code += `                    Object transformedValue = (sourceValue.isMissingNode() || sourceValue.isNull()) ? "${defaultArgs[0] || ""}" : sourceValue;\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "formatDate":
            code += `                    String transformedValue = Instant.parse(sourceValue.asText()).toString();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "toTimestamp":
            code += `                    long transformedValue = Instant.parse(sourceValue.asText()).toEpochMilli();\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", transformedValue);\n`;
            break;
          case "join":
            const joinSeparator = argsStr.replace(/['"]/g, "") || ",";
            code += `                    if (sourceValue.isArray()) {\n`;
            code += `                        StringBuilder sb = new StringBuilder();\n`;
            code += `                        for (int i = 0; i < sourceValue.size(); i++) {\n`;
            code += `                            if (i > 0) sb.append("${joinSeparator}");\n`;
            code += `                            sb.append(sourceValue.get(i).asText());\n`;
            code += `                        }\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", sb.toString());\n`;
            code += `                    } else {\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
            code += `                    }\n`;
            break;
          case "firstElement":
            code += `                    if (sourceValue.isArray() && sourceValue.size() > 0) {\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", sourceValue.get(0));\n`;
            code += `                    } else {\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", null);\n`;
            code += `                    }\n`;
            break;
          case "lastElement":
            code += `                    if (sourceValue.isArray() && sourceValue.size() > 0) {\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", sourceValue.get(sourceValue.size() - 1));\n`;
            code += `                    } else {\n`;
            code += `                        setValueByPath(${targetVar}, "${toPath}", null);\n`;
            code += `                    }\n`;
            break;
          default:
            code += `                    // Unknown transformation: ${rule.transformation}\n`;
            code += `                    setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
        }
      } else if (rule.transformationType === "custom") {
        code += `                    // Custom transformations are not directly supported in Java\n`;
        code += `                    // This would require a custom implementation or a scripting engine\n`;
        code += `                    // For now, we'll just copy the value directly\n`;
        code += `                    setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
      }
    } else {
      code += `                    setValueByPath(${targetVar}, "${toPath}", sourceValue);\n`;
    }

    code += `                }\n`;
    code += `            } catch (Exception e) {\n`;
    code += `                System.err.println("Error mapping ${jsonPathToReadablePath(fromPath)} to ${jsonPathToReadablePath(toPath)}: " + e.getMessage());\n`;
    code += `            }\n\n`;
  }

  code += `            return objectMapper.writeValueAsString(${targetVar});\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Error during transformation: " + e.getMessage());\n`;
  code += `            throw e;\n`;
  code += `        }\n`;
  code += `    }\n\n`;

  // Add helper methods
  code += `    /**
     * Gets a value from a JSON node using a JSONPath-like expression
     */
    private static JsonNode getValueByPath(JsonNode node, String path) {
        try {
            // Handle root path
            if (path.equals("$")) return node;
            
            // Remove $ prefix if present
            String normalizedPath = path.startsWith("$") ? path.substring(1) : path;
            
            // Split path into parts
            List<String[]> parts = new ArrayList<>();
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\\\['([^']+)'\\\\]|\\\\[(\\\\d+)\\\\]");
            java.util.regex.Matcher matcher = pattern.matcher(normalizedPath);
            
            while (matcher.find()) {
                parts.add(new String[] { matcher.group(1), matcher.group(2) });
            }
            
            if (parts.isEmpty()) return null;
            
            JsonNode current = node;
            for (String[] part : parts) {
                String key = part[0] != null ? part[0] : part[1];
                
                if (key == null) continue;
                
                if (part[1] != null) { // Array index
                    int index = Integer.parseInt(key);
                    if (!current.isArray() || index >= current.size()) {
                        return null;
                    }
                    current = current.get(index);
                } else { // Object property
                    if (!current.has(key)) {
                        return null;
                    }
                    current = current.get(key);
                }
                
                if (current == null || current.isMissingNode()) {
                    return null;
                }
            }
            
            return current;
        } catch (Exception e) {
            System.err.println("Error getting value by path: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Sets a value in a JSON node using a JSONPath-like expression
     */
    private static void setValueByPath(ObjectNode rootNode, String path, Object value) {
        try {
            // Handle root path
            if (path.equals("$")) {
                throw new IllegalArgumentException("Cannot replace root node");
            }
            
            // Remove $ prefix if present
            String normalizedPath = path.startsWith("$") ? path.substring(1) : path;
            
            // Split path into parts
            List<String[]> parts = new ArrayList<>();
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\\\['([^']+)'\\\\]|\\\\[(\\\\d+)\\\\]");
            java.util.regex.Matcher matcher = pattern.matcher(normalizedPath);
            
            while (matcher.find()) {
                parts.add(new String[] { matcher.group(1), matcher.group(2) });
            }
            
            if (parts.isEmpty()) return;
            
            // Navigate to the parent node
            JsonNode current = rootNode;
            for (int i = 0; i < parts.size() - 1; i++) {
                String[] part = parts.get(i);
                String key = part[0] != null ? part[0] : part[1];
                
                if (key == null) continue;
                
                if (part[1] != null) { // Array index
                    int index = Integer.parseInt(key);
                    
                    if (!current.isArray()) {
                        if (current.isObject()) {
                            // Create array node if needed
                            String parentKey = getParentKey(parts, i);
                            if (parentKey != null) {
                                ((ObjectNode) current).putArray(parentKey);
                                current = current.get(parentKey);
                            }
                        }
                    }
                    
                    if (current.isArray() && index >= current.size()) {
                        // Expand array if needed
                        ArrayNode arrayNode = (ArrayNode) current;
                        while (arrayNode.size() <= index) {
                            arrayNode.addObject();
                        }
                    }
                    
                    current = current.get(index);
                } else { // Object property
                    if (!current.has(key)) {
                        // Check if next part is array index
                        boolean isNextArray = i + 1 < parts.size() && parts.get(i + 1)[1] != null;
                        if (isNextArray) {
                            ((ObjectNode) current).putArray(key);
                        } else {
                            ((ObjectNode) current).putObject(key);
                        }
                    }
                    current = current.get(key);
                }
            }
            
            // Set the value on the last part
            String[] lastPart = parts.get(parts.size() - 1);
            String lastKey = lastPart[0] != null ? lastPart[0] : lastPart[1];
            
            if (lastKey == null) return;
            
            if (lastPart[1] != null) { // Array index
                int index = Integer.parseInt(lastKey);
                if (current.isArray()) {
                    ArrayNode arrayNode = (ArrayNode) current;
                    while (arrayNode.size() <= index) {
                        arrayNode.addNull();
                    }
                    setJsonNodeValue(arrayNode, index, value);
                }
            } else { // Object property
                if (current.isObject()) {
                    setJsonNodeValue((ObjectNode) current, lastKey, value);
                }
            }
        } catch (Exception e) {
            System.err.println("Error setting value by path: " + e.getMessage());
        }
    }
    
    /**
     * Gets the key of the parent node in a path
     */
    private static String getParentKey(List<String[]> parts, int currentIndex) {
        if (currentIndex <= 0 || currentIndex >= parts.size()) {
            return null;
        }
        
        String[] part = parts.get(currentIndex - 1);
        return part[0] != null ? part[0] : part[1];
    }
    
    /**
     * Sets a value in a JSON node based on its type
     */
    private static void setJsonNodeValue(ObjectNode node, String key, Object value) {
        if (value == null) {
            node.putNull(key);
        } else if (value instanceof String) {
            node.put(key, (String) value);
        } else if (value instanceof Integer) {
            node.put(key, (Integer) value);
        } else if (value instanceof Long) {
            node.put(key, (Long) value);
        } else if (value instanceof Double) {
            node.put(key, (Double) value);
        } else if (value instanceof Float) {
            node.put(key, (Float) value);
        } else if (value instanceof Boolean) {
            node.put(key, (Boolean) value);
        } else if (value instanceof JsonNode) {
            node.set(key, (JsonNode) value);
        } else {
            // Convert other types to string
            node.put(key, value.toString());
        }
    }
    
    /**
     * Sets a value in an array node based on its type
     */
    private static void setJsonNodeValue(ArrayNode node, int index, Object value) {
        if (value == null) {
            node.set(index, null);
        } else if (value instanceof String) {
            node.set(index, objectMapper.valueToTree((String) value));
        } else if (value instanceof Number) {
            node.set(index, objectMapper.valueToTree((Number) value));
        } else if (value instanceof Boolean) {
            node.set(index, objectMapper.valueToTree((Boolean) value));
        } else if (value instanceof JsonNode) {
            node.set(index, (JsonNode) value);
        } else {
            // Convert other types to string
            node.set(index, objectMapper.valueToTree(value.toString()));
        }
    }
}
`;

  return code;
}
