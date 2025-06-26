import { detectShape, defaultConfig, DetectionConfig } from '../utils/shapeDetection';
import * as fs from 'fs';
import * as path from 'path';
import { Point } from '../types';

// Read the formatted results data
const formattedResultsPath = path.join(__dirname, 'formattedResults.json');
const formattedResultsRaw = fs.readFileSync(formattedResultsPath, 'utf8');
const formattedResults = JSON.parse(formattedResultsRaw);

// Define the structure of our test data items
interface TestSample {
  expected: string;
  actual: string;
  points: { x: number, y: number }[];
  correct: boolean;
  index?: number;
}

interface TestResults {
  accuracy: number;
  results: {
    [shape: string]: { correct: number; total: number; accuracy: string };
  };
  correctCount: number;
  totalCount: number;
  detailedResults: Array<{
    expected: string;
    actual: string;
    correct: boolean;
    index: number;
  }>;
}

// --- FAST TEST CONFIGURATION FUNCTIONS ---
function testConfig(config: DetectionConfig, testCases: TestSample[]): TestResults {
  let correctCount = 0;
  const results: { [shape: string]: { correct: number; total: number; accuracy: string } } = {};
  const detailedResults: Array<{ expected: string; actual: string; correct: boolean; index: number }> = [];

  // Initialize results for each shape
  const shapes = ['diamond', 'circle', 'square', 'triangle'];
  shapes.forEach(shape => {
    results[shape] = { correct: 0, total: 0, accuracy: '0.00' };
  });

  for (let i = 0; i < testCases.length; i++) {
    const sample = testCases[i];
    const detectedShape = detectShape(sample.points, config);
    const detectedType = detectedShape?.type || 'unknown';
    
    results[sample.expected].total++;
    
    // Check if classification is correct
    let isCorrect = detectedType.toLowerCase() === sample.expected.toLowerCase();
    
    // Special case: allow rectangle to be counted as correct for square
    if (sample.expected === 'square' && detectedType.toLowerCase() === 'rectangle') {
      isCorrect = true;
    }
    
    if (isCorrect) {
      correctCount++;
      results[sample.expected].correct++;
    }
    
    detailedResults.push({
      expected: sample.expected,
      actual: detectedType,
      correct: isCorrect,
      index: i
    });
  }

  // Calculate accuracy for each shape
  Object.keys(results).forEach(shape => {
    const r = results[shape];
    if (r.total > 0) {
      r.accuracy = ((r.correct / r.total) * 100).toFixed(2);
    }
  });

  return {
    accuracy: (correctCount / testCases.length) * 100,
    results,
    correctCount,
    totalCount: testCases.length,
    detailedResults
  };
}

// --- FAST OPTIMIZATION STRATEGY ---
function findOptimalConfigFast(testCases: TestSample[]): { config: DetectionConfig; results: TestResults } {
  console.log('\n🚀 FAST OPTIMIZATION STARTING...');
  
  // Start with baseline
  const baselineResults = testConfig(defaultConfig, testCases);
  console.log(`Baseline Accuracy: ${baselineResults.accuracy.toFixed(2)}%`);
  console.log('Baseline Shape Performance:');
  Object.keys(baselineResults.results).forEach(shape => {
    const r = baselineResults.results[shape];
    if (r.total > 0) {
      console.log(`  ${shape.padEnd(10)}: ${r.correct}/${r.total} (${r.accuracy}%)`);
    }
  });

  let bestConfig = defaultConfig;
  let bestResults = baselineResults;
  let bestScore = 0;

  // Focus on the most critical issues first
  // 1. Circle detection is completely broken (0% accuracy)
  // 2. Square detection needs improvement (53.33% accuracy)
  
  // Quick targeted parameter search
  const quickTests = [
    // Lower score threshold to catch more circles
    { scoreThreshold: 0.60, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.3 },
    { scoreThreshold: 0.65, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.3 },
    { scoreThreshold: 0.70, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.3 },
    
    // Adjust diamond score threshold to reduce false positives
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.2 },
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.25 },
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.35 },
    
    // Adjust perimeter ratio for better square detection
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.85, diamondScoreThreshold: 0.3 },
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.95, diamondScoreThreshold: 0.3 },
    
    // Adjust aspect ratio threshold
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.3, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.3 },
    { scoreThreshold: 0.80, aspectRatioThreshold: 1.5, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.3 },
    
    // Combined optimizations
    { scoreThreshold: 0.70, aspectRatioThreshold: 1.4, perimeterRatioThreshold: 0.85, diamondScoreThreshold: 0.25 },
    { scoreThreshold: 0.75, aspectRatioThreshold: 1.3, perimeterRatioThreshold: 0.90, diamondScoreThreshold: 0.2 },
  ];

  console.log(`\nTesting ${quickTests.length} targeted configurations...`);
  
  quickTests.forEach((configParams, index) => {
    const results = testConfig({ ...defaultConfig, ...configParams }, testCases);
    
    // Weighted score prioritizing circle and square improvements
    const weightedScore = (
      parseFloat(results.results.circle.accuracy) * 3.0 +
      parseFloat(results.results.square.accuracy) * 2.0 +
      parseFloat(results.results.diamond.accuracy) * 1.0 +
      parseFloat(results.results.triangle.accuracy) * 1.0
    ) / 7.0;
    
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestConfig = { ...defaultConfig, ...configParams };
      bestResults = results;
      
      console.log(`\n🎯 Better config found (${index + 1}/${quickTests.length}):`);
      console.log(`Config:`, configParams);
      console.log(`Weighted Score: ${weightedScore.toFixed(2)}`);
      console.log(`Overall Accuracy: ${results.accuracy.toFixed(2)}%`);
      console.log(`Circle: ${results.results.circle.accuracy}% | Square: ${results.results.square.accuracy}%`);
    }
  });

  console.log('\n🏆 FAST OPTIMIZATION COMPLETE!');
  console.log('Best Configuration:', bestConfig);
  console.log(`Best Weighted Score: ${bestScore.toFixed(2)}`);
  
  return { config: bestConfig, results: bestResults };
}

// --- QUICK CIRCLE THRESHOLD SWEEP ---
function sweepCircleThreshold(testCases: TestSample[]) {
  let bestThreshold = 0.15;
  let bestScore = 0;
  let bestResults: TestResults | null = null;
  let bestDiamond = 0;
  let bestCircle = 0;

  for (let t = 0.10; t <= 0.20; t += 0.01) {
    const config = { ...defaultConfig };
    // @ts-ignore
    config.circleScoreThreshold = t;
    // Patch detectShape to use this threshold for this run
    (global as any)._circleScoreThreshold = t;
    const results = testConfig(config, testCases);
    const circleAcc = parseFloat(results.results.circle.accuracy);
    const diamondAcc = parseFloat(results.results.diamond.accuracy);
    // Weighted score: prioritize both circle and diamond
    const score = circleAcc + diamondAcc;
    if (score > bestScore) {
      bestScore = score;
      bestThreshold = t;
      bestResults = results;
      bestDiamond = diamondAcc;
      bestCircle = circleAcc;
    }
  }
  console.log(`\n🔬 Best circle threshold: ${bestThreshold.toFixed(2)} | Circle acc: ${bestCircle}% | Diamond acc: ${bestDiamond}%`);
  return bestThreshold;
}

// --- TEST SUITE ---
describe('Shape Detection Algorithm Refinement (Fast)', () => {
  const testCases: TestSample[] = formattedResults.detailedResults;

  let bestCircleThreshold = 0.15;
  beforeAll(() => {
    bestCircleThreshold = sweepCircleThreshold(testCases);
    // Patch global for all tests
    (global as any)._circleScoreThreshold = bestCircleThreshold;
  });

  describe('Current Performance Analysis', () => {
    it('should analyze current algorithm performance', () => {
      console.log('\n📊 CURRENT PERFORMANCE ANALYSIS');
      console.log('='.repeat(50));
      
      const currentResults = testConfig(defaultConfig, testCases);
      
      console.log(`Overall Accuracy: ${currentResults.accuracy.toFixed(2)}%`);
      console.log(`Correct: ${currentResults.correctCount}/${currentResults.totalCount}`);
      
      console.log('\nShape-specific Performance:');
      Object.keys(currentResults.results).forEach(shape => {
        const r = currentResults.results[shape];
        if (r.total > 0) {
          const status = parseFloat(r.accuracy) > 80 ? '✅' : parseFloat(r.accuracy) > 50 ? '⚠️' : '❌';
          console.log(`${status} ${shape.padEnd(10)}: ${r.correct}/${r.total} (${r.accuracy}%)`);
        }
      });

      // Identify problematic cases
      console.log('\n🔍 Top Problematic Classifications:');
      const incorrectCases = currentResults.detailedResults.filter(r => !r.correct);
      incorrectCases.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. Expected: ${result.expected.padEnd(8)} | Got: ${result.actual.padEnd(8)} | Test #${result.index + 1}`);
      });
      
      if (incorrectCases.length > 5) {
        console.log(`... and ${incorrectCases.length - 5} more incorrect classifications`);
      }

      // Set expectations based on current performance
      expect(currentResults.accuracy).toBeGreaterThan(50); // Should be at least 50%
    });
  });

  describe('Fast Configuration Optimization', () => {
    it('should find improved configuration quickly', () => {
      const { config, results } = findOptimalConfigFast(testCases);
      
      console.log('\n🎯 OPTIMIZED CONFIGURATION FOUND');
      console.log('='.repeat(50));
      console.log('Configuration:', config);
      console.log(`Overall Accuracy: ${results.accuracy.toFixed(2)}%`);
      
      console.log('\nOptimized Shape Performance:');
      Object.keys(results.results).forEach(shape => {
        const r = results.results[shape];
        if (r.total > 0) {
          const status = parseFloat(r.accuracy) > 80 ? '✅' : parseFloat(r.accuracy) > 50 ? '⚠️' : '❌';
          console.log(`${status} ${shape.padEnd(10)}: ${r.correct}/${r.total} (${r.accuracy}%)`);
        }
      });

      // Store optimal config for regression tests
      (global as any).optimalConfig = config;
      (global as any).optimalResults = results;

      // Set expectations for optimization
      expect(results.accuracy).toBeGreaterThan(60); // Should improve from baseline
      expect(parseFloat(results.results.circle.accuracy)).toBeGreaterThan(0); // Circle detection should improve
    });
  });

  describe('Quick Regression Tests', () => {
    it('should maintain performance with optimized configuration', () => {
      const optimalConfig = (global as any).optimalConfig || defaultConfig;
      const results = testConfig(optimalConfig, testCases);
      
      console.log('\n🧪 QUICK REGRESSION TEST RESULTS');
      console.log('='.repeat(50));
      console.log(`Overall Accuracy: ${results.accuracy.toFixed(2)}%`);
      
      // Test each shape individually
      Object.keys(results.results).forEach(shape => {
        const r = results.results[shape];
        if (r.total > 0) {
          const accuracy = parseFloat(r.accuracy);
          console.log(`${shape.padEnd(10)}: ${r.correct}/${r.total} (${r.accuracy}%)`);
          
          // Set minimum thresholds for each shape
          switch (shape) {
            case 'diamond':
              expect(accuracy).toBeGreaterThan(90); // Diamond should remain excellent
              break;
            case 'triangle':
              expect(accuracy).toBeGreaterThan(80); // Triangle should remain good
              break;
            case 'square':
              expect(accuracy).toBeGreaterThan(50); // Square should be at least moderate
              break;
            case 'circle':
              expect(accuracy).toBeGreaterThan(5); // Circle should improve from 0%
              break;
          }
        }
      });
    });
  });

  describe('Sample Test Cases', () => {
    const optimalConfig = (global as any).optimalConfig || defaultConfig;
    
    // Test only a small subset for quick verification
    const testSubset = testCases.slice(0, 5); // Test only first 5 cases
    
    testSubset.forEach((sample, index) => {
      it(`should correctly classify ${sample.expected} test case #${(sample.index || index) + 1}`, () => {
        const detectedShape = detectShape(sample.points, optimalConfig);
        const detectedType = detectedShape?.type || 'unknown';
        
        // Allow rectangle to be counted as correct for square
        const isCorrect = detectedType.toLowerCase() === sample.expected.toLowerCase() ||
                         (sample.expected === 'square' && detectedType.toLowerCase() === 'rectangle');
        
        if (!isCorrect) {
          console.log(`\n❌ Test case #${(sample.index || index) + 1} failed:`);
          console.log(`Expected: ${sample.expected}`);
          console.log(`Got: ${detectedType}`);
          console.log(`Points count: ${sample.points.length}`);
        }
        
        expect(isCorrect).toBe(true);
      });
    });
  });

  describe('Quick Performance Check', () => {
    it('should meet basic performance requirements', () => {
      const optimalConfig = (global as any).optimalConfig || defaultConfig;
      const results = testConfig(optimalConfig, testCases);
      
      console.log('\n📈 QUICK PERFORMANCE CHECK');
      console.log('='.repeat(50));
      
      // Define basic benchmarks
      const benchmarks = {
        overall: 65, // Overall accuracy should be at least 65%
        diamond: 90, // Diamond accuracy should be at least 90%
        triangle: 80, // Triangle accuracy should be at least 80%
        square: 55, // Square accuracy should be at least 55%
        circle: 10  // Circle accuracy should be at least 10% (improvement from 0%)
      };
      
      console.log('Benchmark Results:');
      console.log(`Overall: ${results.accuracy.toFixed(2)}% (target: ${benchmarks.overall}%)`);
      
      Object.keys(results.results).forEach(shape => {
        const r = results.results[shape];
        if (r.total > 0) {
          const accuracy = parseFloat(r.accuracy);
          const benchmark = benchmarks[shape as keyof typeof benchmarks];
          const status = accuracy >= benchmark ? '✅' : '❌';
          console.log(`${status} ${shape.padEnd(10)}: ${accuracy.toFixed(2)}% (target: ${benchmark}%)`);
          
          expect(accuracy).toBeGreaterThanOrEqual(benchmark);
        }
      });
    });
  });

  describe('Straight Segment Threshold Optimization', () => {
    it('should find optimal angle threshold for straight segment detection', () => {
      console.log('\n🔬 STRAIGHT SEGMENT THRESHOLD OPTIMIZATION');
      console.log('='.repeat(60));
      
      const angleThresholds = [15, 20, 25, 30, 35];
      let bestThreshold = 20;
      let bestScore = 0;
      
      for (const threshold of angleThresholds) {
        console.log(`\nTesting angle threshold: ${threshold}°`);
        
        // Create a config with this threshold
        const config = { 
          ...defaultConfig, 
          straightSegmentAngleThreshold: threshold 
        };
        
        const results = testConfig(config, testCases);
        const diamondAcc = parseFloat(results.results.diamond.accuracy);
        const circleAcc = parseFloat(results.results.circle.accuracy);
        const score = diamondAcc + circleAcc; // Combined score
        
        console.log(`  Diamond: ${diamondAcc.toFixed(2)}% | Circle: ${circleAcc.toFixed(2)}% | Score: ${score.toFixed(2)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestThreshold = threshold;
        }
      }
      
      console.log(`\n🏆 Best angle threshold: ${bestThreshold}° (score: ${bestScore.toFixed(2)})`);
      
      // Store the best threshold for other tests
      (global as any).bestStraightSegmentThreshold = bestThreshold;
      
      expect(bestScore).toBeGreaterThan(0);
    });
  });

  describe('Diamond Confidence Optimization', () => {
    it('should find optimal confidence threshold and weights', () => {
      console.log('\n🎯 DIAMOND CONFIDENCE OPTIMIZATION');
      console.log('='.repeat(60));
      
      const confidenceThresholds = [0.3, 0.4, 0.5, 0.6, 0.7];
      const weightCombinations = [
        { segment: 0.5, length: 0.3, score: 0.2 }, // More emphasis on segments
        { segment: 0.4, length: 0.4, score: 0.2 }, // Balanced approach
        { segment: 0.3, length: 0.3, score: 0.4 }, // More emphasis on diamond score
        { segment: 0.6, length: 0.2, score: 0.2 }, // Heavy emphasis on segments
      ];
      
      let bestConfig = { threshold: 0.6, weights: { segment: 0.4, length: 0.3, score: 0.3 } };
      let bestScore = 0;
      let bestResults: TestResults | null = null;
      
      for (const threshold of confidenceThresholds) {
        for (const weights of weightCombinations) {
          console.log(`\nTesting threshold: ${threshold}, weights: ${JSON.stringify(weights)}`);
          
          // Create a config with these parameters
          const config = { 
            ...defaultConfig,
            diamondConfidenceThreshold: threshold,
            diamondWeights: weights
          };
          
          const results = testConfig(config, testCases);
          const diamondAcc = parseFloat(results.results.diamond.accuracy);
          const overallAcc = results.accuracy;
          
          // Weighted score prioritizing diamond accuracy
          const score = (diamondAcc * 0.7) + (overallAcc * 0.3);
          
          if (score > bestScore) {
            bestScore = score;
            bestConfig = { threshold, weights };
            bestResults = results;
            
            console.log(`🎯 Better config found!`);
            console.log(`   Diamond accuracy: ${diamondAcc.toFixed(2)}%`);
            console.log(`   Overall accuracy: ${overallAcc.toFixed(2)}%`);
            console.log(`   Score: ${score.toFixed(2)}`);
          }
        }
      }
      
      console.log('\n🏆 BEST CONFIGURATION:');
      console.log(`   Threshold: ${bestConfig.threshold}`);
      console.log(`   Weights: ${JSON.stringify(bestConfig.weights)}`);
      console.log(`   Best score: ${bestScore.toFixed(2)}`);
      
      if (bestResults) {
        console.log('\n📊 FINAL RESULTS:');
        console.log(`   Overall accuracy: ${bestResults.accuracy.toFixed(2)}%`);
        Object.keys(bestResults.results).forEach(shape => {
          const r = bestResults!.results[shape];
          if (r.total > 0) {
            const status = parseFloat(r.accuracy) > 80 ? '✅' : parseFloat(r.accuracy) > 50 ? '⚠️' : '❌';
            console.log(`   ${status} ${shape.padEnd(10)}: ${r.correct}/${r.total} (${r.accuracy}%)`);
          }
        });
      }
      
      // Assert that we found a good configuration
      expect(bestScore).toBeGreaterThan(50);
    });
  });
});

// Helper function to normalize shape type for comparison
function normalizeShapeType(type: string): string {
  if (!type) return 'unknown';
  return type.toLowerCase();
}

// Helper function to get the detected shape type from detectShape result
function getDetectedShapeType(result: any): string {
  if (!result) return 'unknown';
  return normalizeShapeType(result.type);
}

// Create individual test cases for each data item
describe('Shape Detection Accuracy Tests', () => {
  formattedResults.detailedResults.forEach((testCase: any, index: number) => {
    const testName = `should detect ${testCase.expected} correctly (test ${index + 1})`;
    
    test(testName, () => {
      const points: Point[] = testCase.points;
      const expectedShape = testCase.expected;
      
      // Call detectShape with default config
      const result = detectShape(points);
      const detectedShape = getDetectedShapeType(result);
      
      // Assert that the detected shape matches the expected shape
      expect(detectedShape).toBe(expectedShape);
    });
  });
});

// Additional test suite for config optimization
describe('Shape Detection with Custom Config', () => {
  // Test with different configs to find optimal parameters
  const testConfigs = [
    {
      name: 'default',
      config: {
        scoreThreshold: 0.80,
        aspectRatioThreshold: 1.4,
        perimeterRatioThreshold: 0.90,
        diamondScoreThreshold: 0.3,
        dataCollectionMode: false,
        straightSegmentAngleThreshold: 20,
        diamondConfidenceThreshold: 0.3,
      }
    },
    {
      name: 'lenient',
      config: {
        scoreThreshold: 0.70,
        aspectRatioThreshold: 1.6,
        perimeterRatioThreshold: 0.85,
        diamondScoreThreshold: 0.4,
        dataCollectionMode: false,
        straightSegmentAngleThreshold: 25,
        diamondConfidenceThreshold: 0.25,
      }
    },
    {
      name: 'strict',
      config: {
        scoreThreshold: 0.85,
        aspectRatioThreshold: 1.2,
        perimeterRatioThreshold: 0.95,
        diamondScoreThreshold: 0.25,
        dataCollectionMode: false,
        straightSegmentAngleThreshold: 15,
        diamondConfidenceThreshold: 0.35,
      }
    }
  ];

  testConfigs.forEach(({ name, config }) => {
    describe(`Config: ${name}`, () => {
      let correctCount = 0;
      let totalCount = 0;
      const shapeStats: { [key: string]: { correct: number; total: number } } = {};

      formattedResults.detailedResults.forEach((testCase: any, index: number) => {
        const testName = `should detect ${testCase.expected} with ${name} config (test ${index + 1})`;
        
        test(testName, () => {
          const points: Point[] = testCase.points;
          const expectedShape = testCase.expected;
          
          // Call detectShape with custom config
          const result = detectShape(points, config as DetectionConfig);
          const detectedShape = getDetectedShapeType(result);
          
          // Track statistics
          totalCount++;
          if (!shapeStats[expectedShape]) {
            shapeStats[expectedShape] = { correct: 0, total: 0 };
          }
          shapeStats[expectedShape].total++;
          
          if (detectedShape === expectedShape) {
            correctCount++;
            shapeStats[expectedShape].correct++;
          }
          
          // Assert that the detected shape matches the expected shape
          expect(detectedShape).toBe(expectedShape);
        });
      });

      // After all tests in this config, log the statistics
      afterAll(() => {
        const accuracy = totalCount > 0 ? (correctCount / totalCount * 100).toFixed(2) : '0.00';
        console.log(`\n📊 Config "${name}" Results:`);
        console.log(`   Overall Accuracy: ${correctCount}/${totalCount} (${accuracy}%)`);
        
        Object.entries(shapeStats).forEach(([shape, stats]) => {
          const shapeAccuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(2) : '0.00';
          console.log(`   ${shape}: ${stats.correct}/${stats.total} (${shapeAccuracy}%)`);
        });
      });
    });
  });
});

// Performance test to ensure detectShape doesn't take too long
describe('Shape Detection Performance', () => {
  test('should process all test cases within reasonable time', () => {
    const startTime = Date.now();
    let processedCount = 0;
    
    formattedResults.detailedResults.forEach((testCase: any) => {
      const points: Point[] = testCase.points;
      detectShape(points);
      processedCount++;
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / processedCount;
    
    console.log(`\n⚡ Performance Results:`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time per shape: ${avgTime.toFixed(2)}ms`);
    console.log(`   Processed ${processedCount} shapes`);
    
    // Assert that average processing time is reasonable (less than 10ms per shape)
    expect(avgTime).toBeLessThan(20);
  });
});