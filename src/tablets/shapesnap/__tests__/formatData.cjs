const fs = require('fs');
const path = require('path');

// Read the console log file
const consoleLogPath = path.join(__dirname, 'dataConsole.txt');
const consoleLog = fs.readFileSync(consoleLogPath, 'utf8');

// Parse the data
const lines = consoleLog.split('\n');
const testData = [];
let currentTest = null;

for (const line of lines) {
  // Look for the TEST_DATA line which contains the JSON
  if (line.includes('📊 TEST_DATA:')) {
    try {
      const jsonStart = line.indexOf('{');
      const jsonStr = line.substring(jsonStart);
      const data = JSON.parse(jsonStr);
      
      // Find the corresponding decision line (should be the line before)
      const lineIndex = lines.indexOf(line);
      let decision = 'UNKNOWN';
      
      // Look for the decision in the previous few lines
      for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
        if (lines[i].includes('🏆 Final decision:')) {
          decision = lines[i].split('🏆 Final decision:')[1].trim();
          break;
        }
      }
      
      testData.push({
        expected: data.expected,
        actual: decision,
        points: data.points,
        correct: data.expected.toLowerCase() === decision.toLowerCase()
      });
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
    }
  }
}

// Calculate statistics
const totalTests = testData.length;
const correctTests = testData.filter(t => t.correct).length;
const accuracy = (correctTests / totalTests * 100).toFixed(2);

// Group by expected shape
const shapeStats = {};
testData.forEach(test => {
  const expected = test.expected;
  if (!shapeStats[expected]) {
    shapeStats[expected] = { total: 0, correct: 0, incorrect: 0 };
  }
  shapeStats[expected].total++;
  if (test.correct) {
    shapeStats[expected].correct++;
  } else {
    shapeStats[expected].incorrect++;
  }
});

// Calculate shape-specific accuracy
Object.keys(shapeStats).forEach(shape => {
  const stats = shapeStats[shape];
  stats.accuracy = (stats.correct / stats.total * 100).toFixed(2);
});

// Output results
console.log('=== SHAPE DETECTION TEST RESULTS ===');
console.log(`Total Tests: ${totalTests}`);
console.log(`Correct: ${correctTests}`);
console.log(`Incorrect: ${totalTests - correctTests}`);
console.log(`Overall Accuracy: ${accuracy}%`);
console.log('\n=== SHAPE-SPECIFIC RESULTS ===');

Object.keys(shapeStats).forEach(shape => {
  const stats = shapeStats[shape];
  console.log(`${shape.toUpperCase()}:`);
  console.log(`  Total: ${stats.total}`);
  console.log(`  Correct: ${stats.correct}`);
  console.log(`  Incorrect: ${stats.incorrect}`);
  console.log(`  Accuracy: ${stats.accuracy}%`);
});

console.log('\n=== DETAILED RESULTS ===');
testData.forEach((test, index) => {
  const status = test.correct ? '✅' : '❌';
  console.log(`${index + 1}. ${status} Expected: ${test.expected}, Got: ${test.actual}`);
});

// Save formatted data to JSON file
const formattedData = {
  summary: {
    totalTests,
    correctTests,
    incorrectTests: totalTests - correctTests,
    accuracy: parseFloat(accuracy)
  },
  shapeStats,
  detailedResults: testData
};

const outputPath = path.join(__dirname, 'formattedResults.json');
fs.writeFileSync(outputPath, JSON.stringify(formattedData, null, 2));
console.log(`\nFormatted results saved to: ${outputPath}`); 