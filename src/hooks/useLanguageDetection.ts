import { useCallback, useRef, useEffect } from 'react';
import { detectLanguage, isAmbiguousLanguage } from '../languages';
import { debounce } from '../utils/domUtils';

// Define the type for the update function from the store for better type safety
type UpdateTabLanguageFn = (tabId: string, language: string, locked: boolean) => void;

// Debounce delay in milliseconds
const LANGUAGE_DETECTION_DEBOUNCE_MS = 400;

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
    languageLocked: boolean
  ) => {
    // --- Pre-checks ---
    if (languageLocked) {
      return; // Don't detect if the language is locked by the user
    }

    const trimmedContent = newContent.trim();

    // --- Handle Empty Content ---
    if (trimmedContent.length === 0) {
      if (currentLanguage !== 'plaintext') {
        updateTabLanguage(tabId, 'plaintext', false); // Reset to plaintext and unlock
      }
      return;
    }

    // --- Heuristic for Significant Change (Paste/Replace) ---
    // Consider it a significant change if length difference is large AND
    // the new content doesn't simply contain the old, or vice-versa (simple append/delete).
    // Checking substrings can be fragile, focusing on length diff might be enough.
    const lengthDifference = Math.abs(prevContent.length - newContent.length);
    const isSignificantChange = lengthDifference > 50 || // Large length change
      (lengthDifference > 10 && !newContent.includes(prevContent) && !prevContent.includes(newContent)); // Moderate change + not simple containment


    // --- Detect Language ---
    const detectedLanguage = detectLanguage(newContent);

    // --- Decide Whether to Update ---
    let shouldUpdate = false;
    if (isSignificantChange) {
      // If it's a significant change, update if the detected language is different
      // or if the current language was just plaintext (to switch away from plaintext).
      if (detectedLanguage !== currentLanguage || currentLanguage === 'plaintext') {
        shouldUpdate = true;
      }
    } else {
      // For normal typing, only update if the detected language *changes*
      if (detectedLanguage !== currentLanguage) {
        shouldUpdate = true;
      }
    }

    // --- Perform Update if Needed ---
    if (shouldUpdate) {
      // Determine if the new language should be automatically locked
      const shouldLock = detectedLanguage !== 'plaintext' && !isAmbiguousLanguage(newContent);
      updateTabLanguage(tabId, detectedLanguage, shouldLock);
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