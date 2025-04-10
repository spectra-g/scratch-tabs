import { useCallback, useRef, useEffect } from 'react';
import { detectLanguage, isAmbiguousLanguage } from '../languages';
import { debounce } from '../utils/domUtils';

// Define the type for the update function from the store for better type safety
type UpdateTabLanguageFn = (tabId: string, language: string, locked: boolean) => void;

// Debounce delay in milliseconds
const LANGUAGE_DETECTION_DEBOUNCE_MS = 400;
// Minimum content length before considering an automatic lock
const MIN_CONTENT_LENGTH_FOR_AUTO_LOCK = 50;
// How many characters difference suggests a non-trivial change?
const SIGNIFICANT_LENGTH_DIFFERENCE = 30;
// How many lines difference suggests a non-trivial change?
const SIGNIFICANT_LINE_DIFFERENCE = 5;

export const useLanguageDetection = (updateTabLanguage: UpdateTabLanguageFn) => {
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
    languageLocked: boolean // IMPORTANT: Rename parameter to clarify it's the USER lock
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
    const newDetectedLanguage = detectLanguage(trimmedNewContent); // Assuming returns { language: string, isAmbiguous: boolean }
    const newDetectionIsAmbiguous = isAmbiguousLanguage(newContent); // Use the ambiguity result from detection

    // --- 5. Decide Whether to Update the Tab's Language ---
    let shouldUpdate = false;

    if (isSignificantChange) {
      // On significant changes, ALWAYS update if the detected language is different from current.
      // This forces re-evaluation after pastes/replaces.
      if (newDetectedLanguage !== currentLanguage) {
        shouldUpdate = true;
      } else {
      }
    } else {
      // For normal typing (non-significant change):
      // Only update if the detected language is different AND the current language isn't already locked automatically.
      // Or if switching away from plaintext.
      // We need the tab's current *auto-lock* state here. Let's assume we can get it.
      // For simplicity without direct access, we can be slightly less strict:
      // Update if detected language changes, OR if we are currently plaintext.
      if (newDetectedLanguage !== currentLanguage && currentLanguage === 'plaintext') {
         shouldUpdate = true;
      } else if (newDetectedLanguage !== currentLanguage) {
         // Avoid flip-flopping if a language was previously auto-locked?
         // This is tricky without knowing the current auto-lock state.
         // Let's allow the update for now, the locking logic below will stabilize it.
         shouldUpdate = true;
      }
    }

    // --- 6. Perform Update and Determine Auto-Lock State ---
    if (shouldUpdate) {
      // Determine if the *new* state warrants an automatic lock
      const contentIsSubstantial = trimmedNewContent.length >= MIN_CONTENT_LENGTH_FOR_AUTO_LOCK;
      const shouldAutoLock =
        newDetectedLanguage !== 'plaintext' && // Don't lock plaintext
        !newDetectionIsAmbiguous &&           // Don't lock if detection is ambiguous
        contentIsSubstantial;                 // Don't lock if content is too short

      // Call the store function to update the language AND the automatic lock state.
      // The store needs to handle clearing any previous auto-lock if shouldAutoLock is false.
      updateTabLanguage(tabId, newDetectedLanguage, shouldAutoLock);
    }

  }, [updateTabLanguage]); // Dependency: The store update function

  // Effect to setup/update the debounced function when the callback changes
  useEffect(() => {
    // Create the debounced function based on the latest callback
    debouncedUpdateRef.current = debounce(performDetectionAndUpdate, LANGUAGE_DETECTION_DEBOUNCE_MS);

    // Cleanup function: Cancel any pending invocation when the hook unmounts
    // or when performDetectionAndUpdate changes (which happens if updateTabLanguage changes)
    return () => {
      debouncedUpdateRef.current?.cancel(); // Use optional chaining and cancel method if available
    };
  }, [performDetectionAndUpdate]); // Re-create debounce if the core logic function changes

  // The function returned by the hook. It calls the debounced function held in the ref.
  const detectAndSetLanguage = useCallback((
    tabId: string,
    newContent: string,
    prevContent: string,
    currentLanguage: string,
    languageLocked: boolean
  ) => {
    // Always call the *current* debounced function from the ref
    debouncedUpdateRef.current?.(tabId, newContent, prevContent, currentLanguage, languageLocked);
  }, []); // This function itself doesn't have dependencies as it relies on the ref

  return {detectAndSetLanguage};
};