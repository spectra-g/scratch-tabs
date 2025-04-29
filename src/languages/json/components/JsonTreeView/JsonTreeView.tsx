import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Copy, Search, ChevronUp } from 'lucide-react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'; // Import specific types

// --- Interfaces ---
interface JsonNodeData {
    key: string | number; // Property name or array index
    value: any;
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    depth: number;
    path: string; // Unique path like "root.users[1].name"
    childCount?: number; // Number of children for objects/arrays
}

// Represents a node in the *visible* flat list for rendering
interface VisibleJsonNode extends JsonNodeData {
    isExpanded: boolean;
    isExpandable: boolean;
}

interface JsonTreeViewProps {
    jsonString: string;
    onClose: () => void;
}

// --- Helper Functions ---

/**
 * Recursively builds the tree structure from parsed JSON data.
 */
const buildTree = (
    key: string | number,
    value: any,
    depth: number,
    path: string
): JsonNodeData => {
    const node: JsonNodeData = {
        key,
        value,
        type: Array.isArray(value) ? 'array' :
              value === null ? 'null' :
              typeof value === 'object' ? 'object' :
              typeof value as 'string' | 'number' | 'boolean', // Type assertion
        depth,
        path,
    };

    if (node.type === 'object' || node.type === 'array') {
        const entries = Object.entries(value);
        node.childCount = entries.length;
        // Note: We don't recursively build children here initially for performance.
        // Children are generated on demand when building the visible list.
    }

    return node;
};

/**
 * Recursively builds a flat list of *visible* nodes based on expansion state.
 */
const buildVisibleNodes = (
    nodeData: JsonNodeData,
    expandedPaths: Set<string>,
    visibleNodesList: VisibleJsonNode[]
): void => {
    const isExpandable = nodeData.type === 'object' || nodeData.type === 'array';
    const isExpanded = isExpandable && expandedPaths.has(nodeData.path);

    visibleNodesList.push({
        ...nodeData,
        isExpanded,
        isExpandable,
    });

    if (isExpandable && isExpanded && nodeData.value) {
        Object.entries(nodeData.value).forEach(([key, value], index) => {
            const childKey = nodeData.type === 'array' ? index : key;
            const childPath = `${nodeData.path}.${childKey}`;
            // Recursively build the child node structure *and* add its visible descendants
            buildVisibleNodes(
                buildTree(childKey, value, nodeData.depth + 1, childPath), // Build child data on the fly
                expandedPaths,
                visibleNodesList
            );
        });
    }
};

/**
 * Recursively collects all expandable node paths from the tree data.
 */
const getAllExpandablePaths = (nodeData: JsonNodeData, paths: Set<string>): void => {
    if (nodeData.type === 'object' || nodeData.type === 'array') {
        paths.add(nodeData.path);
        if (nodeData.value) {
            Object.entries(nodeData.value).forEach(([key, value], index) => {
                const childKey = nodeData.type === 'array' ? index : key;
                const childPath = `${nodeData.path}.${childKey}`;
                // Build minimal child data just for path traversal
                getAllExpandablePaths(buildTree(childKey, value, nodeData.depth + 1, childPath), paths);
            });
        }
    }
};


// --- Main Component ---

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ jsonString }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root'])); // Start with root expanded
    const [selectedPath, setSelectedPath] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const listRef = useRef<List>(null); // Ref for react-window List

    // 1. Parse JSON and build the initial root node structure (only once per jsonString change)
    const rootNodeData = useMemo<JsonNodeData | null>(() => {
        setError(null); // Clear previous errors
        if (!jsonString) {
            // Handle empty string input gracefully
            return buildTree('root', {}, 0, 'root'); // Represent as empty object
        }
        try {
            const parsed = JSON.parse(jsonString);
            return buildTree('root', parsed, 0, 'root');
        } catch (e: any) {
            // Try to provide a more specific error message if possible
            const message = e instanceof Error ? e.message : String(e);
            setError(`Invalid JSON: ${message}`);
            return null;
        }
    }, [jsonString]);

    // 2. Build the flat list of *visible* nodes based on rootNodeData and expandedPaths
    const visibleNodes = useMemo<VisibleJsonNode[]>(() => {
        if (!rootNodeData) return [];
        const visibleNodesList: VisibleJsonNode[] = [];
        buildVisibleNodes(rootNodeData, expandedPaths, visibleNodesList);
        return visibleNodesList;
    }, [rootNodeData, expandedPaths]);

    // 3. Filter the visible nodes based on the search term
    const filteredNodes = useMemo<VisibleJsonNode[]>(() => {
        if (!searchTerm.trim()) return visibleNodes;

        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchedPaths = new Set<string>();
        const result: VisibleJsonNode[] = [];

        // First pass: find all nodes that match directly
        visibleNodes.forEach(node => {
            const keyMatch = String(node.key).toLowerCase().includes(lowerSearchTerm);
            // Avoid searching large objects/arrays directly, search primitives/null
            const valueMatch = (node.type !== 'object' && node.type !== 'array') &&
                               String(node.value).toLowerCase().includes(lowerSearchTerm);

            if (keyMatch || valueMatch) {
                // Add the node and all its ancestors to the set of paths to include
                let currentPath = node.path;
                while (currentPath) {
                    matchedPaths.add(currentPath);
                    if (currentPath === 'root') break;
                    // Get parent path carefully
                    const lastDotIndex = currentPath.lastIndexOf('.');
                    currentPath = lastDotIndex > -1 ? currentPath.substring(0, lastDotIndex) : '';
                }
            }
        });

        // Second pass: build the result list including only matched nodes and their ancestors
        visibleNodes.forEach(node => {
            if (matchedPaths.has(node.path)) {
                result.push(node);
            }
        });

        return result;
    }, [visibleNodes, searchTerm]);

    const toggleNode = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const toggleAllNodes = useCallback((expand: boolean) => {
        if (!rootNodeData) return;
        if (expand) {
            const allPaths = new Set<string>();
            getAllExpandablePaths(rootNodeData, allPaths);
            setExpandedPaths(allPaths);
        } else {
            setExpandedPaths(new Set(['root'])); // Keep root expanded when collapsing all
        }
    }, [rootNodeData]);

    const copyToClipboard = useCallback(async (text: string, type: 'key' | 'value' | 'path') => {
        try {
            await navigator.clipboard.writeText(text);
            // Optional: Add a brief notification/feedback to the user
        } catch (err) {
            console.error(`Failed to copy ${type}:`, err);
            // Optional: Show error feedback to the user
        }
    }, []);

    // --- Rendering ---

    // Render a single row in the virtualized list
    const NodeRenderer = useCallback(({ index, style }: ListChildComponentProps) => {
        const node = filteredNodes[index];
        // Should not happen with correct filtering, but good practice
        if (!node) return <div style={style}></div>;

        const indent = node.depth * 16; // Reduced indent
        const isSelected = selectedPath === node.path;

        // Determine value display string/component
        let valueDisplay: React.ReactNode;
        let valueStringForCopy: string; // For copying the value

        switch (node.type) {
            case 'string':
                valueDisplay = <span className="text-green-400">"{node.value}"</span>;
                valueStringForCopy = String(node.value); // Copy raw string
                break;
            case 'number':
                valueDisplay = <span className="text-yellow-400">{node.value}</span>;
                valueStringForCopy = String(node.value);
                break;
            case 'boolean':
                valueDisplay = <span className="text-purple-400">{String(node.value)}</span>;
                valueStringForCopy = String(node.value);
                break;
            case 'null':
                valueDisplay = <span className="text-gray-500 italic">null</span>;
                valueStringForCopy = 'null';
                break;
            case 'object':
                valueDisplay = <span className="text-gray-400">{`{...} (${node.childCount ?? 0})`}</span>;
                valueStringForCopy = JSON.stringify(node.value, null, 2); // Pretty print for copy
                break;
            case 'array':
                valueDisplay = <span className="text-gray-400">{`[...] (${node.childCount ?? 0})`}</span>;
                valueStringForCopy = JSON.stringify(node.value, null, 2); // Pretty print for copy
                break;
            default:
                valueDisplay = <span className="text-red-500">Unknown Type</span>;
                valueStringForCopy = '[Unknown Type]';
        }

        return (
            <div
                style={{ ...style, paddingLeft: `${indent}px` }}
                className={`flex items-center py-0.5 px-2 group cursor-pointer ${isSelected ? 'bg-blue-900/30' : 'hover:bg-gray-800/60'}`}
                onClick={() => setSelectedPath(node.path)}
                role="button" // Accessibility
                tabIndex={0} // Accessibility
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleNode(node.path); }} // Accessibility
            >
                {/* Indentation Spacer */}
                <div style={{ width: `${indent}px`, flexShrink: 0 }}></div>

                {/* Expand/Collapse Toggle */}
                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                    {node.isExpandable ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.path); }}
                            className="text-gray-500 hover:text-gray-300"
                            aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    ) : null}
                </div>

                {/* Key */}
                <span className="text-blue-400 mr-1 whitespace-nowrap" title={String(node.key)}>
                    {node.key}:
                </span>

                {/* Value */}
                <span className="ml-1 truncate" title={typeof node.value === 'string' ? node.value : undefined}>
                    {valueDisplay}
                </span>

                {/* Actions (visible on hover/selection) */}
                <div className={`ml-auto flex items-center space-x-1 pl-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(node.path, 'path'); }}
                        className="p-0.5 text-gray-500 hover:text-sky-400 hover:bg-gray-700/50 rounded"
                        title={`Copy Path: ${node.path}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(valueStringForCopy, 'value'); }}
                        className="p-0.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded"
                        title="Copy Value"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>
        );
    // Dependencies for the renderer callback
    }, [filteredNodes, selectedPath, toggleNode, copyToClipboard]);


    // --- Main Return ---

    if (error) {
        return (
            // Ensure error message also respects dark theme
            <div className="flex flex-col h-full bg-gray-900 text-gray-200 p-4">
                <h3 className="text-red-500 font-semibold mb-2">Error Parsing JSON</h3>
                <pre className="text-red-400 text-sm bg-red-900/20 p-2 rounded overflow-auto">{error}</pre>
                 {/* Optional: Add a close button here if needed */}
            </div>
        );
    }

    if (!rootNodeData) {
         // Should ideally be caught by error state, but provides a fallback
         return <div className="flex flex-col h-full bg-gray-900 text-gray-400 p-4">Loading or invalid data...</div>;
    }

    return (
        // Component Root - Ensure dark theme classes are applied
        <div className="flex flex-col h-full bg-gray-900 text-gray-200 custom-scrollbar">
            {/* Header: Search and Controls */}
            <div className="flex-none flex items-center p-2 border-b border-gray-700/50 gap-2">
                <div className="flex-1 flex items-center relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={16} pointerEvents="none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search keys/values..."
                        className="bg-gray-800/50 border border-gray-700/50 text-gray-200 pl-8 pr-2 py-1 rounded focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50 w-full text-sm"
                    />
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => toggleAllNodes(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded"
                        title="Expand All"
                    >
                        <ChevronDown size={16} />
                    </button>
                    <button
                        onClick={() => toggleAllNodes(false)}
                        className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded"
                        title="Collapse All"
                    >
                        <ChevronUp size={16} />
                    </button>
                </div>
            </div>

            {/* Tree View Area */}
            <div className="flex-1  bg-gray-900/80"> {/* Apply background here too */}
                <List
                    className="custom-scrollbar"
                    ref={listRef}
                    // Calculate height dynamically if possible, or use a large fixed height
                    // Subtract header/footer height from parent container height
                    // This requires knowing the parent height or using flex-1 and measuring.
                    // Using a fixed height for now, adjust as needed.
                    height={500} // Adjust this based on your modal's content area height
                    itemCount={filteredNodes.length}
                    itemSize={26} // Adjust based on desired row density
                    width="100%"
                    itemKey={(index) => filteredNodes[index]?.path ?? index} // Use path as key for stability
                >
                    {NodeRenderer}
                </List>
            </div>

            {/* Footer: Selected Path */}
            <div className="flex-none p-1.5 border-t border-gray-700/50 text-gray-400 text-xs bg-gray-800/50 truncate">
                <span className="font-semibold">Path:</span> {selectedPath || 'none'}
                {selectedPath && (
                     <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedPath, 'path'); }}
                        className="ml-2 p-0.5 text-gray-500 hover:text-sky-400 hover:bg-gray-700/50 rounded inline-flex align-middle"
                        title={`Copy Path: ${selectedPath}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default JsonTreeView;