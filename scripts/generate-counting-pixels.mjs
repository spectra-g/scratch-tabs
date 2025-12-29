#!/usr/bin/env node
/**
 * Generate counting pixels for all tablets
 *
 * This script creates a 1x1 transparent PNG for each tablet in the public/t/ directory.
 * These files are used for privacy-respecting usage counting via CDN logs.
 *
 * In production builds, these files are served from:
 * https://scratchtabs.b-cdn.net/t/{tabletId}.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base64 encoded 1x1 transparent PNG (68 bytes)
// This is the smallest possible PNG file
const TRANSPARENT_PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Convert base64 to buffer
const pixelBuffer = Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64');

// Get all tablet IDs from the tablets directory
function getAllTabletIds() {
  const tabletsDir = path.join(__dirname, '../src/tablets');
  const entries = fs.readdirSync(tabletsDir, { withFileTypes: true });

  const tabletIds = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !['bridge', 'components', 'utils', '__mocks__', '__tests__'].includes(name)); // Exclude non-tablet directories

  return tabletIds;
}

// Generate counting pixels
function generateCountingPixels() {
  const tabletIds = getAllTabletIds();
  const outputDir = path.join(__dirname, '../public/t');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating counting pixels for ${tabletIds.length} tablets...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const tabletId of tabletIds) {
    const outputPath = path.join(outputDir, `${tabletId}.png`);

    try {
      fs.writeFileSync(outputPath, pixelBuffer);
      console.log(`✓ ${tabletId}.png`);
      successCount++;
    } catch (error) {
      console.error(`✗ ${tabletId}.png - Error: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Generated ${successCount} counting pixels`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors`);
  }

  // Also create the base pixel for reference
  const basePixelPath = path.join(outputDir, 'pixel.png');
  fs.writeFileSync(basePixelPath, pixelBuffer);
  console.log(`\n📦 Base pixel saved to: public/t/pixel.png`);
}

// Run the script
generateCountingPixels();
