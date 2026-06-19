import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * XML Pipeline Operations
 *
 * Operations for formatting and converting XML content.
 */
export const xmlOperations: OperationDefinition[] = [
    {
        id: "xml.format",
        name: "Format XML",
        description: "Pretty-print XML with indentation",
        categories: ["formatting", "xml"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8,
                description: "Number of spaces for indentation"
            },
            {
                name: "preserveComments",
                label: "Preserve Comments",
                type: "boolean",
                default: true,
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indentSize = (params.indent as number) ?? 2;
            const preserveComments = params.preserveComments ?? true;
            const indent = ' '.repeat(indentSize);

            // Remove existing formatting but preserve content
            let xml = input.trim();

            // Store comments temporarily if preserving
            const comments: string[] = [];
            if (preserveComments) {
                xml = xml.replace(/<!--[\s\S]*?-->/g, match => {
                    comments.push(match);
                    return `__COMMENT_${comments.length - 1}__`;
                });
            } else {
                xml = xml.replace(/<!--[\s\S]*?-->/g, '');
            }

            // Remove whitespace between tags
            xml = xml.replace(/>\s+</g, '><');

            // Add newlines after opening tags (except self-closing)
            xml = xml.replace(/(<[^/!][^>]*[^/]>)(?=<)/g, '$1\n');

            // Add newlines before closing tags
            xml = xml.replace(/(<\/[^>]+>)/g, '\n$1');

            // Add newlines after self-closing tags
            xml = xml.replace(/(<[^>]*\/>)/g, '$1\n');

            // Add newlines after declarations
            xml = xml.replace(/(<\?[^?]+\?>)/g, '$1\n');

            // Split into lines and indent
            const lines = xml.split('\n').filter(line => line.trim());
            let indentLevel = 0;
            const formatted: string[] = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                // Check if this is a closing tag
                const isClosingTag = /^<\//.test(trimmedLine);
                const isSelfClosing = /\/>$/.test(trimmedLine);
                const isDeclaration = /^<\?/.test(trimmedLine);
                const isComment = /^__COMMENT_\d+__$/.test(trimmedLine);

                // Decrease indent for closing tags
                if (isClosingTag) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }

                formatted.push(indent.repeat(indentLevel) + trimmedLine);

                // Increase indent for opening tags (but not self-closing, declarations, or comments)
                if (!isClosingTag && !isSelfClosing && !isDeclaration && !isComment && /^<[^/!?]/.test(trimmedLine)) {
                    indentLevel++;
                }
            }

            let result = formatted.join('\n');

            // Restore comments
            if (preserveComments) {
                comments.forEach((comment, i) => {
                    result = result.replace(`__COMMENT_${i}__`, comment);
                });
            }

            return result;
        },
        keywords: ["xml", "format", "prettify", "beautify", "indent"],
        source: "core",
    },
    {
        id: "xml.minify",
        name: "Minify XML",
        description: "Remove whitespace and formatting from XML",
        categories: ["formatting", "xml"],
        parameters: [
            {
                name: "removeComments",
                label: "Remove Comments",
                type: "boolean",
                default: false,
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const removeComments = params.removeComments ?? false;

            let xml = input.trim();

            if (removeComments) {
                xml = xml.replace(/<!--[\s\S]*?-->/g, '');
            }

            // Remove whitespace between tags
            xml = xml.replace(/>\s+</g, '><');

            // Remove leading/trailing whitespace from text nodes
            xml = xml.replace(/>\s+/g, '>').replace(/\s+</g, '<');

            return xml.trim();
        },
        keywords: ["xml", "minify", "compress", "compact"],
        source: "core",
    },
    {
        id: "xml.to-json",
        name: "XML to JSON",
        description: "Convert XML to JSON format",
        categories: ["conversion", "xml"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "JSON indentation (0 = minified)"
            },
            {
                name: "textKey",
                label: "Text Content Key",
                type: "string",
                default: "_text",
                description: "Key name for text content"
            },
            {
                name: "attributePrefix",
                label: "Attribute Prefix",
                type: "string",
                default: "@",
                description: "Prefix for attribute keys"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indentSize = (params.indent as number) ?? 2;
            const textKey = (params.textKey as string) ?? "_text";
            const attrPrefix = (params.attributePrefix as string) ?? "@";

            // Simple XML parser (no external dependencies)
            const parseXml = (xml: string): unknown => {
                // Remove XML declaration
                xml = xml.replace(/<\?xml[^?]*\?>/gi, '').trim();

                // Remove comments
                xml = xml.replace(/<!--[\s\S]*?-->/g, '');

                // Parse element
                const parseElement = (str: string): { result: unknown; remaining: string } => {
                    str = str.trim();

                    // Check for text content (no tags)
                    if (!str.startsWith('<')) {
                        const endIdx = str.indexOf('<');
                        if (endIdx === -1) {
                            return { result: str.trim(), remaining: '' };
                        }
                        const text = str.substring(0, endIdx).trim();
                        return { result: text, remaining: str.substring(endIdx) };
                    }

                    // Match opening tag
                    const tagMatch = str.match(/^<([^\s/>]+)([^>]*?)(\/?)>/);
                    if (!tagMatch) {
                        // Not a valid tag, return as text
                        return { result: str, remaining: '' };
                    }

                    const [fullMatch, tagName, attrString, selfClosing] = tagMatch;
                    const element: Record<string, unknown> = {};

                    // Parse attributes
                    const attrRegex = /([^\s=]+)=["']([^"']*)["']/g;
                    let attrMatch;
                    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
                        element[attrPrefix + attrMatch[1]] = attrMatch[2];
                    }

                    let remaining = str.substring(fullMatch.length);

                    if (selfClosing) {
                        return { result: { [tagName]: element }, remaining };
                    }

                    // Find closing tag and parse content
                    const closingTag = `</${tagName}>`;
                    let depth = 1;
                    let contentEnd = 0;
                    let i = 0;

                    while (i < remaining.length && depth > 0) {
                        if (remaining.substring(i).startsWith(`<${tagName}`)) {
                            // Check if it's an opening tag (not self-closing)
                            const nextClose = remaining.indexOf('>', i);
                            if (nextClose !== -1 && remaining[nextClose - 1] !== '/') {
                                depth++;
                            }
                            i = nextClose + 1;
                        } else if (remaining.substring(i).startsWith(closingTag)) {
                            depth--;
                            if (depth === 0) {
                                contentEnd = i;
                            }
                            i += closingTag.length;
                        } else {
                            i++;
                        }
                    }

                    const content = remaining.substring(0, contentEnd).trim();
                    remaining = remaining.substring(contentEnd + closingTag.length);

                    // Parse children
                    if (content) {
                        let childStr = content;
                        const children: unknown[] = [];
                        let textContent = '';

                        while (childStr.trim()) {
                            const trimmed = childStr.trim();

                            if (!trimmed.startsWith('<')) {
                                // Text content
                                const nextTag = trimmed.indexOf('<');
                                if (nextTag === -1) {
                                    textContent += trimmed;
                                    break;
                                } else {
                                    textContent += trimmed.substring(0, nextTag);
                                    childStr = trimmed.substring(nextTag);
                                }
                            } else {
                                const { result: child, remaining: rest } = parseElement(trimmed);
                                if (child && typeof child === 'object') {
                                    children.push(child);
                                }
                                childStr = rest;
                            }
                        }

                        // Merge children into element
                        children.forEach(child => {
                            if (typeof child === 'object' && child !== null) {
                                for (const [key, value] of Object.entries(child as Record<string, unknown>)) {
                                    if (element[key] !== undefined) {
                                        // Convert to array if multiple same-named children
                                        if (!Array.isArray(element[key])) {
                                            element[key] = [element[key]];
                                        }
                                        (element[key] as unknown[]).push(value);
                                    } else {
                                        element[key] = value;
                                    }
                                }
                            }
                        });

                        // Add text content if present
                        textContent = textContent.trim();
                        if (textContent) {
                            if (Object.keys(element).length === 0) {
                                // Element only has text content
                                return { result: { [tagName]: textContent }, remaining };
                            }
                            element[textKey] = textContent;
                        }
                    }

                    // Simplify if element only has text content
                    if (Object.keys(element).length === 0) {
                        return { result: { [tagName]: null }, remaining };
                    }

                    return { result: { [tagName]: element }, remaining };
                };

                const { result } = parseElement(xml);
                return result;
            };

            try {
                const json = parseXml(input);
                return indentSize === 0
                    ? JSON.stringify(json)
                    : JSON.stringify(json, null, indentSize);
            } catch (e: any) {
                throw new Error(`Failed to parse XML: ${e.message}`);
            }
        },
        keywords: ["xml", "json", "convert", "parse"],
        source: "core",
    },
    {
        id: "xml.xpath",
        name: "XPath Query",
        description: "Evaluate an XPath 1.0 expression on XML input and return matching results",
        categories: ["xml", "query"],
        parameters: [
            {
                name: "query",
                label: "XPath Expression",
                type: "string",
                default: "//*",
                placeholder: "//element/@attribute",
                description: "XPath 1.0 expression to evaluate",
            },
            {
                name: "resultType",
                label: "Result Type",
                type: "select",
                default: "any",
                options: [
                    { value: "any", label: "Auto-detect" },
                    { value: "nodes", label: "Node Set" },
                    { value: "string", label: "String" },
                    { value: "number", label: "Number" },
                    { value: "boolean", label: "Boolean" },
                ],
            },
            {
                name: "nodeFormat",
                label: "Node Output Format",
                type: "select",
                default: "text",
                options: [
                    { value: "text", label: "Text Content" },
                    { value: "xml", label: "XML Serialization" },
                ],
            },
            {
                name: "separator",
                label: "Result Separator",
                type: "string",
                default: "\\n",
                description: "String separating multiple node results (use \\n for newline)",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const query = (params.query as string) ?? "//*";
            const resultTypeParam = (params.resultType as string) ?? "any";
            const nodeFormat = (params.nodeFormat as string) ?? "text";
            // Allow literal \n in the UI separator field to mean an actual newline
            const rawSep = (params.separator as string) ?? "\\n";
            const separator = rawSep.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

            const parser = new DOMParser();
            const doc = parser.parseFromString(input, "application/xml");

            const parseError = doc.querySelector("parsererror");
            if (parseError) {
                throw new Error(`XML parse error: ${parseError.textContent?.trim()}`);
            }

            // XPathResult type constants (avoid relying on global XPathResult in workers)
            const XPATH_TYPES: Record<string, number> = {
                any: 0,    // ANY_TYPE
                nodes: 5,  // ORDERED_NODE_ITERATOR_TYPE
                string: 2, // STRING_TYPE
                number: 1, // NUMBER_TYPE
                boolean: 3, // BOOLEAN_TYPE
            };

            const xpathType = XPATH_TYPES[resultTypeParam] ?? 0;

            let xpathResult: XPathResult;
            try {
                xpathResult = doc.evaluate(query, doc, null, xpathType, null);
            } catch (e: any) {
                throw new Error(`XPath evaluation failed: ${e.message}`);
            }

            const serializeNode = (node: Node): string => {
                if (nodeFormat === "xml") {
                    return new XMLSerializer().serializeToString(node);
                }
                return node.textContent ?? "";
            };

            switch (xpathResult.resultType) {
                case 1: // NUMBER_TYPE
                    return String(xpathResult.numberValue);
                case 2: // STRING_TYPE
                    return xpathResult.stringValue;
                case 3: // BOOLEAN_TYPE
                    return String(xpathResult.booleanValue);
                case 6: // UNORDERED_NODE_SNAPSHOT_TYPE
                case 7: { // ORDERED_NODE_SNAPSHOT_TYPE
                    const results: string[] = [];
                    for (let i = 0; i < xpathResult.snapshotLength; i++) {
                        const node = xpathResult.snapshotItem(i);
                        if (node) results.push(serializeNode(node));
                    }
                    return results.join(separator);
                }
                case 8: // ANY_UNORDERED_NODE_TYPE
                case 9: { // FIRST_ORDERED_NODE_TYPE
                    const node = xpathResult.singleNodeValue;
                    return node ? serializeNode(node) : "";
                }
                default: {
                    // Iterator types (4=UNORDERED, 5=ORDERED) and fallback for ANY_TYPE
                    const results: string[] = [];
                    let node = xpathResult.iterateNext();
                    while (node) {
                        results.push(serializeNode(node));
                        node = xpathResult.iterateNext();
                    }
                    return results.join(separator);
                }
            }
        },
        keywords: ["xml", "xpath", "query", "extract", "select", "path"],
        source: "core",
    },
    {
        id: "json.to-xml",
        name: "JSON to XML",
        description: "Convert JSON to XML format",
        categories: ["conversion", "xml"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "XML indentation (0 = minified)"
            },
            {
                name: "rootElement",
                label: "Root Element",
                type: "string",
                default: "root",
                description: "Name of root element (if input is array)"
            },
            {
                name: "arrayItemName",
                label: "Array Item Name",
                type: "string",
                default: "item",
                description: "Element name for array items"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indentSize = (params.indent as number) ?? 2;
            const rootElement = (params.rootElement as string) ?? "root";
            const arrayItemName = (params.arrayItemName as string) ?? "item";
            const indentStr = ' '.repeat(indentSize);

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e: any) {
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }

            const escapeXml = (str: string): string => {
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            };

            const toXml = (value: unknown, tagName: string, level: number): string => {
                const currentIndent = indentSize > 0 ? indentStr.repeat(level) : '';
                const newline = indentSize > 0 ? '\n' : '';

                if (value === null || value === undefined) {
                    return `${currentIndent}<${tagName}/>${newline}`;
                }

                if (Array.isArray(value)) {
                    return value
                        .map(item => toXml(item, tagName, level))
                        .join('');
                }

                if (typeof value === 'object') {
                    const entries = Object.entries(value as Record<string, unknown>);

                    if (entries.length === 0) {
                        return `${currentIndent}<${tagName}/>${newline}`;
                    }

                    const children = entries
                        .map(([key, val]) => {
                            // Handle attributes (keys starting with @)
                            if (key.startsWith('@')) {
                                return ''; // Skip, handled separately
                            }
                            // Handle text content
                            if (key === '_text') {
                                return escapeXml(String(val));
                            }
                            return toXml(val, key, level + 1);
                        })
                        .filter(Boolean)
                        .join('');

                    // Extract attributes
                    const attrs = entries
                        .filter(([key]) => key.startsWith('@'))
                        .map(([key, val]) => ` ${key.substring(1)}="${escapeXml(String(val))}"`)
                        .join('');

                    // Check if children have nested content
                    const hasNestedElements = entries.some(([key]) => !key.startsWith('@') && key !== '_text');

                    if (hasNestedElements) {
                        return `${currentIndent}<${tagName}${attrs}>${newline}${children}${currentIndent}</${tagName}>${newline}`;
                    } else {
                        const textContent = entries.find(([key]) => key === '_text');
                        if (textContent) {
                            return `${currentIndent}<${tagName}${attrs}>${escapeXml(String(textContent[1]))}</${tagName}>${newline}`;
                        }
                        return `${currentIndent}<${tagName}${attrs}/>${newline}`;
                    }
                }

                // Primitive value
                return `${currentIndent}<${tagName}>${escapeXml(String(value))}</${tagName}>${newline}`;
            };

            // Handle arrays at root level
            if (Array.isArray(data)) {
                const items = data.map(item => toXml(item, arrayItemName, 1)).join('');
                return `<${rootElement}>\n${items}</${rootElement}>`;
            }

            // Handle objects
            if (typeof data === 'object' && data !== null) {
                const entries = Object.entries(data as Record<string, unknown>);
                if (entries.length === 1) {
                    // Single root element
                    const [key, value] = entries[0];
                    return toXml(value, key, 0).trim();
                }
            }

            // Wrap in root element
            return toXml(data, rootElement, 0).trim();
        },
        keywords: ["json", "xml", "convert", "generate"],
        source: "core",
    }
];

// Self-register all operations
xmlOperations.forEach(op => operationRegistry.register(op));

export default xmlOperations;
