import { useCallback, useRef, useEffect } from 'react';
import { detectLanguage, isAmbiguousLanguage } from '../languages';
import { debounce } from '../utils/domUtils';

// Define the type for the update function from the store for better type safety
type UpdateTabLanguageFn = (tabId: string, language: string, locked: boolean) => void;

// Debounce delay in milliseconds
const LANGUAGE_DETECTION_DEBOUNCE_MS = 400;
// How many characters difference suggests a non-trivial change?
const SIGNIFICANT_LENGTH_DIFFERENCE = 30;
// How many lines difference suggests a non-trivial change?
const SIGNIFICANT_LINE_DIFFERENCE = 5;

export const useLanguageDetection = (
  updateTabLanguage: UpdateTabLanguageFn,
  onLanguageDetectedOnSignificantChange?: (tabId: string, language: string) => void
) => {
  // useRef to hold the latest debounced function instance.
  // This ensures we always call the most recent version if updateTabLanguage changes,
  // while still debouncing the execution.
  const debouncedUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  // The core logic for detection and updating, wrapped in useCallback
  const performDetectionAndUpdate = useCallback((
    tabId: string,
    newContent: string,
    prevContent: string,
    currentLanguage: string,
    languageLocked: boolean // Whether the language is locked by the user
  ) => {
    // --- 1. Respect Manual Lock ---
    if (languageLocked) {
      return; // User has explicitly set the language, do nothing.
    }

    const trimmedNewContent = newContent.trim();
    const trimmedOldContent = prevContent.trim();

    // --- 2. Handle Empty Content ---
    if (trimmedNewContent.length === 0) {
      if (currentLanguage !== 'plaintext') {
        // Reset to plaintext and explicitly signal to remove any auto-lock
        updateTabLanguage(tabId, 'plaintext', false);
      }
      return;
    }

    // --- 3. Determine if the Change is Significant ---
    // Heuristics to guess if it was likely a paste/replace vs. typing
    const lengthDifference = Math.abs(trimmedNewContent.length - trimmedOldContent.length);
    const newLines = trimmedNewContent.split('\n');
    const oldLines = trimmedOldContent.split('\n');
    const lineDifference = Math.abs(newLines.length - oldLines.length);

    // Significant if: large length/line diff OR content doesn't start/end similarly (suggesting replacement)
    const isSignificantChange =
      lengthDifference > SIGNIFICANT_LENGTH_DIFFERENCE ||
      lineDifference > SIGNIFICANT_LINE_DIFFERENCE ||
      (trimmedNewContent.length > 0 && trimmedOldContent.length > 0 && // Avoid triggering on first char
       !trimmedNewContent.startsWith(trimmedOldContent.substring(0, 10)) && // Doesn't start like the old (prefix check)
       !trimmedOldContent.startsWith(trimmedNewContent.substring(0, 10)) && // Old doesn't start like the new
       lengthDifference > 5); // Add a small length diff requirement for the prefix check

    // --- 4. Perform Language Detection ---
    // Always detect unless manually locked or empty
    const newDetectedLanguage = detectLanguage(trimmedNewContent);
    const newDetectionIsAmbiguous = isAmbiguousLanguage(newContent); // Use the ambiguity result from detection

    // --- 5. Decide Whether to Update the Tab's Language ---
    let shouldUpdate = false;
    let shouldTriggerAutoFormat = false;

    if (isSignificantChange) {
      // On significant changes, ALWAYS update if the detected language is different from current.
      // This forces re-evaluation after pastes/replaces.
      if (newDetectedLanguage !== currentLanguage) {
        shouldUpdate = true;
        shouldTriggerAutoFormat = true; // This is the key addition - trigger auto-format on significant language changes
      }
    } else {
      // For normal typing (non-significant change):
      // Only update if the detected language is different and:
      // 1. We're currently in plaintext mode, OR
      // 2. The new detection is reasonably confident and not ambiguous
      if (newDetectedLanguage !== currentLanguage) {
        if (currentLanguage === 'plaintext' || !newDetectionIsAmbiguous) {
          shouldUpdate = true;
          // Don't trigger auto-format for regular typing-induced language changes
        }
      }
    }

    // --- 6. Perform Update ---
    if (shouldUpdate) {
      // Update the language with the lock parameter set to false to ensure user can override
      updateTabLanguage(tabId, newDetectedLanguage, false);
      
      // Trigger auto-format if this was a significant change that resulted in language detection
      if (shouldTriggerAutoFormat) {
        // Use setTimeout to ensure the language change is processed first
        setTimeout(() => {
          onLanguageDetectedOnSignificantChange?.(tabId, newDetectedLanguage);
        }, 50); // Small delay to ensure language is set before formatting
      }
    }

  }, [updateTabLanguage, onLanguageDetectedOnSignificantChange]); // Add callback to dependencies

  // Effect to setup/update the debounced function when the callback changes
  useEffect(() => {
    // Create a new debounced function whenever performDetectionAndUpdate changes
    debouncedUpdateRef.current = debounce(performDetectionAndUpdate, LANGUAGE_DETECTION_DEBOUNCE_MS);
    
    return () => {
      // Cleanup: cancel any pending debounced calls
      debouncedUpdateRef.current?.cancel();
    };
  }, [performDetectionAndUpdate]);

  // Return a function to trigger the debounced detection when tab content changes
  const detectAndSetLanguage = useCallback((
    tabId: string,
    newContent: string,
    prevContent: string,
    currentLanguage: string,
    languageLocked: boolean
  ) => {
    // Directly invoke the latest debounced function stored in the ref
    debouncedUpdateRef.current?.(tabId, newContent, prevContent, currentLanguage, languageLocked);
  }, []); // No dependencies - will remain stable across renders
  
  return { detectAndSetLanguage };
};