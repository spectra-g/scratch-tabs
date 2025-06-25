import { detectShape } from '../utils/shapeDetection';
import { Point } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Read the test data
const testDataPath = path.join(__dirname, 'formattedResults.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

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

// Statistics tracking
const shapeStats: { [key: string]: { 
  correct: number; 
  total: number; 
  misclassifications: { [key: string]: number } 
} } = {};

// Initialize stats for all expected shapes
testData.detailedResults.forEach((testCase: any) => {
  const expectedShape = testCase.expected;
  if (!shapeStats[expectedShape]) {
    shapeStats[expectedShape] = { correct: 0, total: 0, misclassifications: {} };
  }
  shapeStats[expectedShape].total++;
});

// Create individual test cases for each data item
describe('Individual Shape Detection Tests', () => {
    testData.detailedResults.forEach((testCase: any, index: number) => {
      const testName = `should detect ${testCase.expected} correctly (test ${index + 1})`;
      
      test(testName, () => {
        const points: Point[] = testCase.points;
        const expectedShape = testCase.expected;
        
        // Call detectShape with default config
        const result = detectShape(points);
        const detectedShape = getDetectedShapeType(result);
        
        let isCorrect = detectedShape === expectedShape;
        
        // Special case: A square detected as a rectangle is also correct.
        if (expectedShape === 'square' && detectedShape === 'rectangle') {
          isCorrect = true;
        }
        
        // Track statistics
        if (isCorrect) {
          shapeStats[expectedShape].correct++;
        } else {
          // Track misclassification
          if (!shapeStats[expectedShape].misclassifications[detectedShape]) {
            shapeStats[expectedShape].misclassifications[detectedShape] = 0;
          }
          shapeStats[expectedShape].misclassifications[detectedShape]++;
        }
        
        // Assert that the classification is correct based on our rules
        expect(isCorrect).toBe(true);
      });
    });
  });

// Separate test that always runs to show summary
describe('Test Summary', () => {
  test('should display comprehensive accuracy summary', () => {
    // This test will always pass and show the summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SHAPE DETECTION ACCURACY SUMMARY');
    console.log('='.repeat(80));
    
    let totalCorrect = 0;
    let totalTests = 0;
    
    Object.entries(shapeStats).forEach(([expectedShape, stats]) => {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : '0.0';
      totalCorrect += stats.correct;
      totalTests += stats.total;
      
      console.log(`\n${expectedShape.toUpperCase()}:`);
      console.log(`  Accuracy: ${stats.correct}/${stats.total} (${accuracy}%)`);
      
      if (Object.keys(stats.misclassifications).length > 0) {
        const misclassList = Object.entries(stats.misclassifications)
          .map(([detected, count]) => `${count} incorrectly detected as ${detected}`)
          .join(', ');
        console.log(`  Misclassifications: ${misclassList}`);
      } else {
        console.log(`  Misclassifications: None (perfect detection!)`);
      }
    });
    
    const overallAccuracy = totalTests > 0 ? (totalCorrect / totalTests * 100).toFixed(1) : '0.0';
    console.log('\n' + '-'.repeat(80));
    console.log(`OVERALL ACCURACY: ${totalCorrect}/${totalTests} (${overallAccuracy}%)`);
    console.log('='.repeat(80));
    
    // Additional insights
    console.log('\n🔍 KEY INSIGHTS:');
    Object.entries(shapeStats).forEach(([expectedShape, stats]) => {
      const accuracy = parseFloat((stats.correct / stats.total * 100).toFixed(1));
      if (accuracy < 50) {
        console.log(`  ⚠️  ${expectedShape.toUpperCase()} has poor accuracy (${accuracy}%)`);
      } else if (accuracy < 80) {
        console.log(`  ⚡ ${expectedShape.toUpperCase()} needs improvement (${accuracy}%)`);
      } else {
        console.log(`  ✅ ${expectedShape.toUpperCase()} performing well (${accuracy}%)`);
      }
    });
    
    // This test always passes
    expect(true).toBe(true);
  });
}); 