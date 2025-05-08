import React, { useRef, useEffect } from 'react';
import { Editor, Monaco } from '@monaco-editor/react'; // Import Monaco type directly from here
import type * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'; // Keep for specific types if needed
import { Tab } from '../../types';
import { SearchResult } from '../../stores/searchStore';

interface SearchPreviewPaneProps {
    tab: Tab | null | undefined;
    selectedResult: SearchResult | null;
}

// Type alias for clarity
type MonacoApi = typeof monacoEditor;

export const SearchPreviewPane: React.FC<SearchPreviewPaneProps> = ({ tab, selectedResult }) => {
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoApi | null>(null); // Ref to store the monaco instance
    const decorationsRef = useRef<string[]>([]); // To keep track of old decorations

    // Capture both editor and monaco instances on mount
    const handleEditorDidMount = (
        editor: monacoEditor.editor.IStandaloneCodeEditor,
        monacoInstance: MonacoApi
    ) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance; // Store the monaco instance
    };

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current; // Get the stored monaco instance

        // Ensure both editor and monaco API are available
        if (!editor || !monaco) {
            // If no editor/monaco, maybe clear content if editor exists?
            if (editor && !tab) editor.setValue('');
            return;
        }

        // If no tab is selected, clear the editor content and decorations
        if (!tab) {
            const model = editor.getModel();
            if (model && model.getValue() !== '') {
                model.setValue('');
            }
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
            return;
        }

        // --- Update content and language if tab changes ---
        const model = editor.getModel();
        if (model) {
            // Only update value if it's actually different
            if (model.getValue() !== tab.content) {
                model.setValue(tab.content);
            }
            // Set language using the monaco instance
            if (model.getLanguageId() !== tab.language) {
                monaco.editor.setModelLanguage(model, tab.language);
            }
        }

        // --- Apply decorations if a result is selected for the *current* tab ---
        if (selectedResult && selectedResult.tabId === tab.id) {
            const { lineNumber, matchIndex, matchLength } = selectedResult;

            // Ensure lineNumber is valid
            if (lineNumber > 0 && model && lineNumber <= model.getLineCount()) {
                // Clear previous decorations and apply new ones
                decorationsRef.current = editor.deltaDecorations(
                    decorationsRef.current, // Old decoration IDs to remove
                    [
                        // Highlight the entire line
                        {
                            range: new monaco.Range(lineNumber, 1, lineNumber, 1), // Range covers the start of the line
                            options: {
                                isWholeLine: true,
                                className: 'search-highlight-line bg-blue-900/20', // Tailwind class for line background
                                overviewRuler: { // Show marker in overview ruler (scrollbar)
                                    color: 'rgba(0, 122, 204, 0.7)',
                                    // Use the monaco instance for the enum
                                    position: monaco.editor.OverviewRulerLane.Center
                                }
                            }
                        },
                        // Highlight the specific match
                        {
                            // Ensure column numbers are valid
                            range: new monaco.Range(
                                lineNumber,
                                Math.max(1, matchIndex + 1), // Ensure start column is at least 1
                                lineNumber,
                                Math.max(1, matchIndex + matchLength + 1) // Ensure end column is valid
                            ),
                            options: {
                                className: 'search-highlight-match bg-yellow-500/40', // Tailwind class for match background
                                inlineClassName: 'search-match-inline-decoration', // Can style this for underline etc.
                                // Use the monaco instance for the enum
                                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                            }
                        }
                    ]
                );

                // Reveal the line using the monaco instance for the enum
                editor.revealLineInCenterIfOutsideViewport(lineNumber, monaco.editor.ScrollType.Smooth);
            } else {
                 console.warn(`Invalid lineNumber (${lineNumber}) for highlighting in tab ${tab.id}`);
                 // Clear decorations if line number is invalid
                 decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
            }
        } else {
            // Clear decorations if no result is selected or result is for a different tab
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        }

    }, [tab, selectedResult]); // Rerun when tab or selectedResult changes

    return (
        <Editor
            height="100%"
            // Use a key derived from the tab ID to force a full remount when the tab changes.
            // This often helps reset internal Monaco state reliably.
            key={tab?.id || 'no-preview-tab'}
            language={tab?.language || 'plaintext'}
            value={tab?.content || ''}
            theme="vs-dark"
            onMount={handleEditorDidMount} // Pass the updated handler
            options={{
                readOnly: true,
                minimap: { enabled: true }, // Enable minimap for context
                fontSize: 13,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 },
                renderLineHighlight: 'none',
                occurrencesHighlight: false,
            }}
        />
    );
};