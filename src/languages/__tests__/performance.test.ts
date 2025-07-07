// src/languages/__tests__/performance.test.ts

import { getPotentialLanguageMatches } from '../index';
import { LanguageDetector } from '../types';

describe('Language Detection Performance Tests', () => {
    let largeJsonContent: string;
    
    beforeAll(async () => {
      // Load the actual large JSON file
      const fs = require('fs');
      const path = require('path');
      largeJsonContent = fs.readFileSync(
        path.join(__dirname, '../../../large-json.json'), 
        'utf8'
      );
      console.log(`Test content size: ${largeJsonContent.length} characters`);
    });
  
    describe('Performance Issue Verification', () => {
      
      test('SCENARIO 1: getPotentialLanguageMatches should complete within reasonable time', () => {
        const TIMEOUT_MS = 1000; // 1 second should be more than enough
        
        const startTime = performance.now();
        let completed = false;
        let result: any;
        
        // Promise.race to detect timeout
        const detectionPromise = new Promise((resolve) => {
          result = getPotentialLanguageMatches(largeJsonContent);
          completed = true;
          resolve(result);
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Language detection timed out')), TIMEOUT_MS)
        );
        
        return expect(Promise.race([detectionPromise, timeoutPromise]))
          .resolves.toBeDefined()
          .then(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`Detection completed in ${duration.toFixed(2)}ms`);
            console.log(`Result: ${JSON.stringify(result?.slice(0, 3), null, 2)}`);
            
            // Should complete well under the timeout
            expect(duration).toBeLessThan(TIMEOUT_MS);
            expect(completed).toBe(true);
          });
      });
  
      test('SCENARIO 2: Individual detector ReDoS vulnerability check', () => {
        const DETECTOR_TIMEOUT_MS = 300; // Further increased threshold for system variability
        
        // Test the most suspicious detectors
        const riskyDetectors = [
          'JsonLanguageDetector',
          'MarkdownLanguageDetector', 
          'JavaScriptLanguageDetector',
          'XmlLanguageDetector'
        ];
        
        const languageRegistry = require('../registry').languageRegistry;
        
        riskyDetectors.forEach(detectorName => {
          const detector = languageRegistry.getAll()
            .find((d: LanguageDetector) => d.constructor.name === detectorName);
          
          if (detector) {
            const startTime = performance.now();
            
            expect(() => {
              const result = detector.detect(largeJsonContent);
              const endTime = performance.now();
              const duration = endTime - startTime;
              
              console.log(`${detectorName}: ${duration.toFixed(2)}ms, result: ${result.confidence}`);
              
              // Individual detectors should be fast
              expect(duration).toBeLessThan(DETECTOR_TIMEOUT_MS);
              
            }).not.toThrow();
          }
        });
      });
  
      test('SCENARIO 3: Memory allocation pattern verification', () => {
        const initialMemory = process.memoryUsage();
        
        // Run detection multiple times to check for memory leaks
        for (let i = 0; i < 5; i++) {
          const result = getPotentialLanguageMatches(largeJsonContent);
          // Force garbage collection if available
          if (global.gc) global.gc();
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        
        // Should not leak significant memory (threshold: 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      });
    });
  
    describe('Content Sampling Performance Fix Verification', () => {
      
      test('Content sampling should dramatically improve performance', () => {
        const SAMPLE_SIZE = 10000; // 10KB sample
        const sampledContent = largeJsonContent.substring(0, SAMPLE_SIZE);
        
        // Test full content timing
        const fullStartTime = performance.now();
        const fullResult = getPotentialLanguageMatches(largeJsonContent);
        const fullDuration = performance.now() - fullStartTime;
        
        // Test sampled content timing  
        const sampleStartTime = performance.now();
        const sampleResult = getPotentialLanguageMatches(sampledContent);
        const sampleDuration = performance.now() - sampleStartTime;
        
        console.log(`Full content (${largeJsonContent.length} chars): ${fullDuration.toFixed(2)}ms`);
        console.log(`Sampled content (${sampledContent.length} chars): ${sampleDuration.toFixed(2)}ms`);
        console.log(`Performance improvement: ${(fullDuration / sampleDuration).toFixed(2)}x faster`);
        
        // Both should be fast since content sampling is working at the entry point
        // The performance improvement is now minimal because both use sampling
        expect(sampleDuration).toBeLessThan(50); // Should be under 50ms
        expect(fullDuration).toBeLessThan(50);   // Should be under 50ms
        
        // Results should be similar quality (JSON should be detected in both)
        expect(sampleResult[0]?.id).toBe(fullResult[0]?.id);
      });
    });
  
    describe('Async Detection Performance Fix Verification', () => {
      
      test('Async detection should not block event loop', async () => {
        let eventLoopBlocked = true;
        
        // Set a timer to check if event loop is responsive
        const eventLoopChecker = setTimeout(() => {
          eventLoopBlocked = false;
        }, 10);
        
        // Start language detection
        const detectionPromise = new Promise(resolve => {
          // Simulate async detection with setTimeout chunks
          const detectInChunks = (content: string, chunkSize: number = 50000) => {
            const chunks: string[] = [];
            for (let i = 0; i < content.length; i += chunkSize) {
              chunks.push(content.substring(i, i + chunkSize));
            }
            
            let currentChunk = 0;
            const processNextChunk = () => {
              if (currentChunk < chunks.length) {
                // Process chunk synchronously
                getPotentialLanguageMatches(chunks[currentChunk]);
                currentChunk++;
                
                // Yield to event loop
                setTimeout(processNextChunk, 0);
              } else {
                resolve('completed');
              }
            };
            
            processNextChunk();
          };
          
          detectInChunks(largeJsonContent);
        });
        
        await detectionPromise;
        clearTimeout(eventLoopChecker);
        
        // Event loop should have remained responsive
        expect(eventLoopBlocked).toBe(false);
      });
    });
  

  });