const fs = require('fs');
const path = require('path');

/**
 * This script processes a console log file to extract drawing coordinates and
 * appends them as new test cases to a JSON file.
 *
 * Usage: node <script_path> <shape_type>
 * Example: node src/tablets/shapesnap/__tests__/processNewData.js curved-arrow
 *
 * The script expects a log file named 'newData.log' in the project root.
 */

// 1. Get Shape Type from Command Line Arguments
const shapeType = process.argv[2];
if (!['curved-arrow', 'orthogonal-arrow', 'straight-arrow'].includes(shapeType)) {
  console.error('Error: Invalid or missing shape type.');
  console.error('Usage: node processNewData.js <curved-arrow|orthogonal-arrow|straight-arrow>');
  process.exit(1);
}

// 2. Define File Paths
const logFilePath = path.join(__dirname, '../../../../', 'newData.log');
const jsonFilePath = path.join(__dirname, 'formattedResults.json');

console.log(`Processing shape: ${shapeType}`);
console.log(`Reading log file from: ${logFilePath}`);
console.log(`Updating JSON file at: ${jsonFilePath}`);

// 3. Read the Log File
let logContent;
try {
  logContent = fs.readFileSync(logFilePath, 'utf-8');
} catch (error) {
  console.error(`Error reading log file: ${error.message}`);
  console.error(`Please make sure 'newData.log' exists in the project root.`);
  process.exit(1);
}

// 4. Extract Coordinate Data
const drawingAttemptRegex = /=== DRAWING ATTEMPT ===.*?shapeDetection\.ts:\d+ Raw coordinates: (\[.*?\])/gs;
const allCoordinates = [];
let match;

while ((match = drawingAttemptRegex.exec(logContent)) !== null) {
  try {
    const coords = JSON.parse(match[1]);
    allCoordinates.push(coords);
  } catch (e) {
    console.warn('Could not parse coordinates from a log line:', match[1]);
  }
}

if (allCoordinates.length === 0) {
  console.error('No coordinates found in the log file. Please check the log format.');
  process.exit(1);
}

console.log(`Found ${allCoordinates.length} sets of coordinates in the log file.`);

// 5. Read Existing JSON Data
let resultsData;
try {
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
  resultsData = JSON.parse(jsonContent);
} catch (error) {
  console.error(`Error reading or parsing JSON file: ${error.message}`);
  // If the file doesn't exist or is invalid, start with a default structure
  resultsData = {
    summary: {},
    shapeStats: {},
    detailedResults: [],
  };
  console.log('Starting with a new results structure.');
}

// 6. Create and Append New Test Cases
const newTestCases = allCoordinates.map(coords => ({
  expected: shapeType,
  points: coords
}));

// Append the new cases to the existing ones
resultsData.detailedResults.push(...newTestCases);

console.log(`Adding ${newTestCases.length} new test cases for shape '${shapeType}'.`);

// 7. Write Updated Data Back to File
try {
  const updatedJsonContent = JSON.stringify(resultsData, null, 2);
  fs.writeFileSync(jsonFilePath, updatedJsonContent, 'utf-8');
  console.log(`Successfully updated formattedResults.json! Total test cases: ${resultsData.detailedResults.length}`);
} catch (error) {
  console.error(`Error writing updated JSON file: ${error.message}`);
  process.exit(1);
} 