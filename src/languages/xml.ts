import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

export class XmlLanguageDetector extends BaseLanguageDetector {
    id = 'xml';
    name = 'XML';
    extensions = ['xml', 'xsd', 'svg', 'rss', 'plist', 'xaml', 'csproj', 'wsdl']; // Added more common XML extensions
    priority = 3; // Lower priority than potentially more specific formats like HTML

    sampleContent(): string {
        // A slightly more complex example
        return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>
    <dependencies>
        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.12</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`;
    }

    /**
     * Checks for common XML patterns like the declaration or opening/closing tags.
     */
    isMatch(content: string): boolean {
        const trimmed = content.trim();
        // Check for XML declaration or common root element patterns
        return /^\s*<\?xml\s+version\s*=/i.test(trimmed) // XML declaration
            || /^\s*<!DOCTYPE\s/i.test(trimmed) // DOCTYPE
            || /^\s*<[a-zA-Z_][\w.-]*(\s|>|xmlns=)/.test(trimmed); // Opening root tag
    }

    /**
     * Registers XML language support and formatting provider with Monaco.
     */
    registerProvider(monaco: any): void {
        // Monaco has built-in support for XML syntax highlighting, themes, etc.
        // We only need to register the ID if it's not already there (unlikely)
        // and then add our custom formatter.
        if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'xml')) {
            monaco.languages.register({ id: 'xml' });
        }

        // Configure XML formatting provider using a regex-based approach
        monaco.languages.registerDocumentFormattingEditProvider('xml', {
            provideDocumentFormattingEdits(model: any, options: any) {
                const content = model.getValue();
                const tabSize = options?.tabSize ?? 4;
                const insertSpaces = options?.insertSpaces ?? true;
                const indentChar = insertSpaces ? ' '.repeat(tabSize) : '\t';

                // Refined Line-by-Line XML Formatter
                const formatXml = (xml: string, indent: string): string => {
                    let formatted = '';
                    let indentLevel = 0;
                    const lines = xml.split('\n');

                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return; // Skip empty lines

                        // Determine tag types more carefully
                        const isClosingTag = trimmedLine.startsWith('</');
                        const isSelfClosingTag = trimmedLine.endsWith('/>');
                        const isProcessingInstruction = trimmedLine.startsWith('<?');
                        const isComment = trimmedLine.startsWith('<!--');
                        const isDoctype = trimmedLine.startsWith('<!DOCTYPE');
                        const isCdata = trimmedLine.startsWith('<![CDATA['); // Assume CDATA fits on one line for this basic approach
                        const isOpeningTagOnly = trimmedLine.startsWith('<') && !isClosingTag && !isSelfClosingTag && !isProcessingInstruction && !isComment && !isDoctype && !isCdata;
                        // Heuristic: Check if a line contains both opening and closing for simple cases like <tag>value</tag>
                        const containsOpeningAndClosing = isOpeningTagOnly && trimmedLine.includes('</');


                        // 1. Adjust Indentation Level *Before* Adding Line
                        //    Dedent if the current line STARTS with a closing tag
                        if (isClosingTag) {
                            indentLevel = Math.max(0, indentLevel - 1);
                        }

                        // 2. Add the indented line
                        formatted += indent.repeat(indentLevel) + trimmedLine + '\n';

                        // 3. Adjust Indentation Level *After* Adding Line (for the *next* line)
                        //    Indent if the current line was purely an opening tag (not self-closing, not closing on same line)
                        if (isOpeningTagOnly && !containsOpeningAndClosing) {
                            indentLevel++;
                        }
                        // No change for self-closing, comments, PI, DOCTYPE, CDATA, or simple closing tags.
                    });

                    // Remove trailing newline
                    return formatted.trimEnd();
                };

                try {
                    // Basic pre-pass to ensure each tag starts on a new line for simpler processing
                    // This helps handle cases like <tag1><tag2> on one line.
                    const normalizedContent = content.replace(/>(\s*)</g, '>\n$1<');

                    const formattedText = formatXml(normalizedContent, indentChar);
                    return [{
                        range: model.getFullModelRange(),
                        text: formattedText
                    }];
                } catch (e) {
                    console.error("XML Formatting Error:", e);
                    return [];
                }
            }

            // Rest of the XmlLanguageDetector class...

            // Rest of the XmlLanguageDetector class...

            // Rest of the XmlLanguageDetector class remains the same...
            // registerProvider, constructor, isMatch, sampleContent, etc.

            // Rest of the XmlLanguageDetector class remains the same...
            // registerProvider, constructor, isMatch, sampleContent, etc.
        });
    }

    // No need for countSpecificPatterns for XML detection usually
}

// --- Registration ---
const xmlDetector = new XmlLanguageDetector();
languageRegistry.register(xmlDetector);

// Optional: Export for explicit registration if needed elsewhere
export const registerXmlProvider = (monaco: any) => {
    xmlDetector.registerProvider(monaco);
};