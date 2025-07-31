export interface JsonStats {
  overallStats: {
    totalKeys: number;
    maxDepth: number;
    objectSizeKB: number;
    totalNodes: number;
  };
  keyAnalysis: {
    [key: string]: number;
  };
  valueAnalysis: {
    [type: string]: {
      count: number;
      percentage: number;
    };
  };
  arrayStats: {
    totalArrays: number;
    lengths: {
      min: number;
      max: number;
      average: number;
    };
    arrayDetails: Array<{
      path: string;
      length: number;
      elementTypes: string[];
    }>;
  };
  stringStats: {
    totalStrings: number;
    lengths: {
      min: number;
      max: number;
      average: number;
    };
    examples: {
      shortest: string;
      longest: string;
    };
  };
  numberStats: {
    totalNumbers: number;
    integers: number;
    floats: number;
    range: {
      min: number;
      max: number;
    };
  };
}

export function analyzeJson(jsonString: string): JsonStats {
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Invalid JSON: Cannot analyze malformed JSON");
  }

  const stats: JsonStats = {
    overallStats: {
      totalKeys: 0,
      maxDepth: 0,
      objectSizeKB: 0,
      totalNodes: 0,
    },
    keyAnalysis: {},
    valueAnalysis: {},
    arrayStats: {
      totalArrays: 0,
      lengths: { min: Infinity, max: 0, average: 0 },
      arrayDetails: [],
    },
    stringStats: {
      totalStrings: 0,
      lengths: { min: Infinity, max: 0, average: 0 },
      examples: { shortest: "", longest: "" },
    },
    numberStats: {
      totalNumbers: 0,
      integers: 0,
      floats: 0,
      range: { min: Infinity, max: -Infinity },
    },
  };

  // Calculate object size in KB
  stats.overallStats.objectSizeKB = new Blob([jsonString]).size / 1024;

  const valueTypeCounts: { [type: string]: number } = {};
  const arrayLengths: number[] = [];
  const stringLengths: number[] = [];
  let shortestString = "";
  let longestString = "";

  function traverse(obj: any, depth: number = 0, path: string = "root"): void {
    stats.overallStats.maxDepth = Math.max(stats.overallStats.maxDepth, depth);
    stats.overallStats.totalNodes++;

    if (obj === null) {
      valueTypeCounts.null = (valueTypeCounts.null || 0) + 1;
      return;
    }

    if (Array.isArray(obj)) {
      stats.arrayStats.totalArrays++;
      const arrayLength = obj.length;
      arrayLengths.push(arrayLength);
      
      stats.arrayStats.lengths.min = Math.min(stats.arrayStats.lengths.min, arrayLength);
      stats.arrayStats.lengths.max = Math.max(stats.arrayStats.lengths.max, arrayLength);

      // Analyze array element types
      const elementTypes = new Set<string>();
      obj.forEach((item, index) => {
        const itemType = Array.isArray(item) ? 'array' : item === null ? 'null' : typeof item;
        elementTypes.add(itemType);
        traverse(item, depth + 1, `${path}[${index}]`);
      });

      stats.arrayStats.arrayDetails.push({
        path,
        length: arrayLength,
        elementTypes: Array.from(elementTypes),
      });

      valueTypeCounts.array = (valueTypeCounts.array || 0) + 1;
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        stats.overallStats.totalKeys++;
        stats.keyAnalysis[key] = (stats.keyAnalysis[key] || 0) + 1;
        traverse(value, depth + 1, path === "root" ? key : `${path}.${key}`);
      });
      valueTypeCounts.object = (valueTypeCounts.object || 0) + 1;
    } else if (typeof obj === 'string') {
      stats.stringStats.totalStrings++;
      stringLengths.push(obj.length);
      
      stats.stringStats.lengths.min = Math.min(stats.stringStats.lengths.min, obj.length);
      stats.stringStats.lengths.max = Math.max(stats.stringStats.lengths.max, obj.length);

      if (!shortestString || obj.length < shortestString.length) {
        shortestString = obj;
      }
      if (!longestString || obj.length > longestString.length) {
        longestString = obj;
      }

      valueTypeCounts.string = (valueTypeCounts.string || 0) + 1;
    } else if (typeof obj === 'number') {
      stats.numberStats.totalNumbers++;
      
      if (Number.isInteger(obj)) {
        stats.numberStats.integers++;
      } else {
        stats.numberStats.floats++;
      }

      stats.numberStats.range.min = Math.min(stats.numberStats.range.min, obj);
      stats.numberStats.range.max = Math.max(stats.numberStats.range.max, obj);

      valueTypeCounts.number = (valueTypeCounts.number || 0) + 1;
    } else if (typeof obj === 'boolean') {
      valueTypeCounts.boolean = (valueTypeCounts.boolean || 0) + 1;
    }
  }

  traverse(parsedJson);

  // Calculate averages
  if (arrayLengths.length > 0) {
    stats.arrayStats.lengths.average = arrayLengths.reduce((a, b) => a + b, 0) / arrayLengths.length;
  }
  if (stats.arrayStats.lengths.min === Infinity) {
    stats.arrayStats.lengths.min = 0;
  }

  if (stringLengths.length > 0) {
    stats.stringStats.lengths.average = stringLengths.reduce((a, b) => a + b, 0) / stringLengths.length;
    stats.stringStats.examples.shortest = shortestString;
    stats.stringStats.examples.longest = longestString;
  }
  if (stats.stringStats.lengths.min === Infinity) {
    stats.stringStats.lengths.min = 0;
  }

  if (stats.numberStats.range.min === Infinity) {
    stats.numberStats.range.min = 0;
  }
  if (stats.numberStats.range.max === -Infinity) {
    stats.numberStats.range.max = 0;
  }

  // Calculate percentages for value analysis
  const totalValues = Object.values(valueTypeCounts).reduce((a, b) => a + b, 0);
  Object.entries(valueTypeCounts).forEach(([type, count]) => {
    stats.valueAnalysis[type] = {
      count,
      percentage: totalValues > 0 ? (count / totalValues) * 100 : 0,
    };
  });

  return stats;
}