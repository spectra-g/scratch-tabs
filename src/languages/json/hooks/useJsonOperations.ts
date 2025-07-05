import { useCallback } from 'react';
import * as monaco from 'monaco-editor'; // Import monaco namespace
import { unstringifyJson } from '../utils/unstringify';
import { extractJsonFromText } from '../utils/extractJson';
import { Tab } from '../../../types';

export const useJsonOperations = (
  editor: monaco.editor.IStandaloneCodeEditor | null, // Allow editor to be null initially
  addBackgroundTab?: (tab: Tab) => void // Optional function to add background tabs
) => {

  // Helper function to apply edits while preserving undo stack
  const applyEdit = useCallback((newContent: string, source: string) => {
    if (!editor) return; // Guard against null editor

    const model = editor.getModel();
    if (!model) return; // Guard against null model

    const fullRange = model.getFullModelRange();

    // Use executeEdits to integrate with undo stack
    editor.executeEdits(
      source, // Source identifier for the edits (optional but good practice)
      [
        {
          range: fullRange,
          text: newContent,
          forceMoveMarkers: true // Adjust markers like errors/warnings
        }
      ],
      // Define how the selection should be after the edit
      // Here, we set the cursor to the beginning of the document
      () => [new monaco.Selection(1, 1, 1, 1)]
    );
  }, [editor]);

  const handleFormat = useCallback(() => {
    if (!editor) return;
    // Built-in format action usually handles undo stack correctly
    editor.getAction('editor.action.formatDocument')?.run();
  }, [editor]);

  const handleMinify = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      
      // Safety check: don't parse very large content
      if (content.length > 1_000_000) {
        console.log(`JSON Minify: Content too large (${content.length} bytes), skipping minify`); // <<< ADD THIS
        return;
      }
      
      const json = JSON.parse(content);
      const minifiedContent = JSON.stringify(json);
      applyEdit(minifiedContent, 'json.minify'); // Use applyEdit
    } catch (error) {
      console.error('Failed to minify JSON:', error);
      // Optionally show an error to the user (e.g., using a notification system)
    }
  }, [editor, applyEdit]);

  const handleSortKeys = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      
      // Safety check: don't parse very large content
      if (content.length > 1_000_000) {
        console.log(`JSON SortKeys: Content too large (${content.length} bytes), skipping sort`); // <<< ADD THIS
        return;
      }
      
      const json = JSON.parse(content);

      const sortObjectKeys = (obj: any): any => {
        // Keep your recursive sort logic
        if (obj === null) return null; // Handle null explicitly
        if (Array.isArray(obj)) {
          return obj.map(sortObjectKeys);
        }
        if (obj && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((acc: any, key) => {
              acc[key] = sortObjectKeys(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      };

      const sorted = sortObjectKeys(json);
      const sortedContent = JSON.stringify(sorted, null, 2); // Assuming format after sort
      applyEdit(sortedContent, 'json.sortKeys'); // Use applyEdit
    } catch (error) {
      console.error('Failed to sort JSON keys:', error);
    }
  }, [editor, applyEdit]);

  const handleFlatten = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      if (typeof json !== 'object' || json === null || Array.isArray(json)) {
         console.error('Flatten requires a JSON object.');
         // Optionally show user error
         return;
      }

      const flatten = (obj: any, prefix = '', res: any = {}): any => {
        for(const key in obj){
            const newKey = prefix ? prefix + '.' + key : key;
            if(typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])){
                flatten(obj[key], newKey, res);
            } else {
                res[newKey] = obj[key];
            }
        }
        return res;
      };

      const flattened = flatten(json);
      const flattenedContent = JSON.stringify(flattened, null, 2); // Format output
      applyEdit(flattenedContent, 'json.flatten'); // Use applyEdit
    } catch (error) {
      console.error('Failed to flatten JSON:', error);
    }
  }, [editor, applyEdit]);

  const handleUnflatten = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
       if (typeof json !== 'object' || json === null || Array.isArray(json)) {
         console.error('Unflatten requires a flat JSON object.');
         // Optionally show user error
         return;
      }

      const unflatten = (data: any): any => {
        if (Object(data) !== data || Array.isArray(data)) return data;
        const regex = /\.?([^.[\]]+)|\[(\d+)\]/g;
        const result: any = {};
        for (const p in data) {
            let cur = result;
            let prop = "";
            let m;
            while (m = regex.exec(p)) {
                cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
                prop = m[2] || m[1];
            }
            cur[prop] = data[p];
        }
        return result[""] || result; // Handle root case
      };


      const unflattened = unflatten(json);
      const unflattenedContent = JSON.stringify(unflattened, null, 2); // Format output
      applyEdit(unflattenedContent, 'json.unflatten'); // Use applyEdit
    } catch (error) {
      console.error('Failed to unflatten JSON:', error);
    }
  }, [editor, applyEdit]);

  const handleRemoveEmpty = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      const removeEmpty = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj
            .map(removeEmpty) // Recurse into array elements
            .filter(item => item !== null && item !== undefined && item !== ''); // Filter null/undefined/empty strings
        }

        if (obj && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            const value = removeEmpty(obj[key]); // Recurse into object values
            // Keep if value is not null/undefined/empty string
            // AND if it's an array, it's not empty
            // AND if it's an object, it's not empty
            if (value !== null && value !== undefined && value !== '' &&
                !(Array.isArray(value) && value.length === 0) &&
                !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
            ) {
              newObj[key] = value;
            }
          }
          // Return null if the resulting object is empty, otherwise return the object
          // This allows parent nodes to remove empty objects entirely
          return Object.keys(newObj).length === 0 ? null : newObj;
        }

        // Keep non-empty primitives (handle empty string case here too)
        return (obj === '' || obj === null || obj === undefined) ? null : obj;
      };

      // Initial call might result in null if the entire root object becomes empty
      const cleaned = removeEmpty(json) ?? {}; // Default to empty object if root becomes null
      const cleanedContent = JSON.stringify(cleaned, null, 2); // Format output
      applyEdit(cleanedContent, 'json.removeEmpty'); // Use applyEdit
    } catch (error) {
      console.error('Failed to remove empty values:', error);
    }
  }, [editor, applyEdit]);

  const handleRemoveComments = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      
      // Remove comments while respecting JSON string boundaries
      const removeJsonComments = (text: string): string => {
        let result = '';
        let inString = false;
        let escaped = false;
        let i = 0;
        
        while (i < text.length) {
          const current = text[i];
          const next = text[i + 1];
          
          if (escaped) {
            // Handle escaped characters
            result += current;
            escaped = false;
            i++;
            continue;
          }
          
          if (current === '\\' && inString) {
            // Handle escape sequences inside strings
            escaped = true;
            result += current;
            i++;
            continue;
          }
          
          if (current === '"') {
            // Toggle string state
            inString = !inString;
            result += current;
            i++;
            continue;
          }
          
          if (!inString) {
            // Check for comments only when outside strings
            if (current === '/' && next === '/') {
              // Single line comment - skip until end of line
              while (i < text.length && text[i] !== '\n') {
                i++;
              }
              // Keep the newline character
              if (i < text.length && text[i] === '\n') {
                result += text[i];
                i++;
              }
              continue;
            }
            
            if (current === '/' && next === '*') {
              // Multi-line comment - skip until */
              i += 2; // Skip /*
              while (i < text.length - 1) {
                if (text[i] === '*' && text[i + 1] === '/') {
                  i += 2; // Skip */
                  break;
                }
                i++;
              }
              continue;
            }
          }
          
          // Regular character - add to result
          result += current;
          i++;
        }
        
        return result;
      };
      
      const noComments = removeJsonComments(content);
      
      // Remove empty lines that might be left after comment removal
      const noEmptyLines = noComments.split('\n')
        .filter(line => line.trim())
        .join('\n');

      applyEdit(noEmptyLines, 'json.removeComments');
    } catch (error) {
      console.error('Failed to remove comments:', error);
    }
  }, [editor, applyEdit]);
  
  // --- Operations that DON'T modify the editor directly ---
  // --- These don't need the applyEdit helper ---

  const handleStringify = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue(); // Get the raw text content (which should be JSON)
      try {
        JSON.parse(content); // Try parsing to validate
      } catch (parseError) {
        console.error('Cannot stringify invalid JSON:', parseError);
        return; // Stop if the input JSON is invalid
      }

      const stringifiedRepresentation = JSON.stringify(content);
      applyEdit(stringifiedRepresentation, 'json.stringify'); // Use applyEdit to directly update editor
    } catch (error) {
      console.error('Failed during stringify operation:', error);
    }
  }, [editor, applyEdit]);

  // --- Unstringify operation ---
  const handleUnstringify = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      // Use the statically imported unstringify utility
      const unstringified = unstringifyJson(content);
      applyEdit(unstringified, 'json.unstringify');
    } catch (error) {
      console.error('Failed to unstringify JSON:', error);
    }
  }, [editor, applyEdit]);

  // --- Extract JSON operation ---
  const handleExtractJson = useCallback(() => {
    if (!editor || !addBackgroundTab) return;
    
    try {
      const content = editor.getValue();
      const extractedJsons = extractJsonFromText(content);
      
      if (extractedJsons.length === 0) {
        console.log('No JSON found in content');
        return;
      }
      
      // Replace the current editor content with the first JSON found
      const firstJson = extractedJsons[0];
      let formattedJson: string;
      
      if (firstJson.isStringified) {
        formattedJson = firstJson.content; // Already formatted by extractJson
      } else {
        try {
          const parsed = JSON.parse(firstJson.content);
          formattedJson = JSON.stringify(parsed, null, 2);
        } catch (e) {
          formattedJson = firstJson.content; // Use as-is if formatting fails
        }
      }
      
      applyEdit(formattedJson, 'json.extract');
      
      // Create background tabs for any additional JSON found
      if (extractedJsons.length > 1) {
        for (let i = 1; i < extractedJsons.length; i++) {
          const jsonExtract = extractedJsons[i];
          let tabContent: string;
          
          if (jsonExtract.isStringified) {
            tabContent = jsonExtract.content; // Already formatted
          } else {
            try {
              const parsed = JSON.parse(jsonExtract.content);
              tabContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
              tabContent = jsonExtract.content; // Use as-is if formatting fails
            }
          }
          
          const newTab: Tab = {
            id: crypto.randomUUID(),
            title: `Extracted JSON ${i + 1}`,
            content: tabContent,
            language: 'json',
            languageLocked: true, // Lock to JSON as requested
            cursorPosition: { lineNumber: 1, column: 1 },
            dateCreated: Date.now(),
            lastModified: Date.now(),
            workspaceId: '', // Will be set by the store
            isPinned: false
          };
          
          addBackgroundTab(newTab);
        }
      }
    } catch (error) {
      console.error('Failed to extract JSON:', error);
    }
  }, [editor, addBackgroundTab, applyEdit]);

  return {
    handleFormat,
    handleMinify,
    handleSortKeys,
    handleFlatten,
    handleUnflatten,
    handleRemoveEmpty,
    handleRemoveComments,
    handleStringify,
    handleUnstringify,
    handleExtractJson
  };
};