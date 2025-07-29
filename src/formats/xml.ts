import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * XML language detector
 */
export class XmlFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "xml"; // Monaco's built-in ID for XML
  name = "XML";
  extensions = [
    "xml",
    "xsd",
    "rss",
    "atom",
    "plist",
    "xaml",
    "csproj",
    "vbproj",
    "fsproj",
    "xsl",
    "xslt",
    "wsdl",
    "config",
    "manifest",
    "pom",
    "jnlp",
    "kml",
    "gpx",
    "collada",
    "dae",
    "drawio", // Common diagramming format
  ];
  priority = 4; // XML is foundational; HTML might have higher priority for .htm/.html

  sampleContent(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- This is a sample XML document -->
<library name="My Awesome Library" location="Downtown Central">
    <book id="bk101" available="true">
        <author title="Mr.">Gambardella, Matthew</author>
        <title>XML Developer's Guide</title>
        <genre>Computer</genre>
        <price>44.95</price>
        <publish_date>2000-10-01</publish_date>
        <description>An in-depth look at creating applications with XML.</description>
        <borrower empty-value="" />
    </book>
    <book id="bk102" available="false">
        <author title="Dr.">Ralls, Kim</author>
        <title>Midnight Rain</title>
        <genre>Fantasy</genre>
        <price>5.95</price>
        <publish_date>2000-12-16</publish_date>
        <description>A former architect battles corporate zombies, 
        an evil sorceress, and her own childhood to become queen 
        of the world.</description>
        <borrower type="student">student001</borrower>
    </book>
    <journal issue="Spring 2024">
        <article page="10">
            <title>The Future of Quantum Computing</title>
            <author>Dr. Eva Quantum</author>
        </article>
    </journal>
    <special-element self-closing="true"/>
    <elementWithCData><![CDATA[ This <should> not be &parsed; as XML tags. ]]></elementWithCData>
</library>`;
  }

  /**
   * Detects if the given content matches XML patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 7) {
      // e.g., "<a/>" or "<a></a>"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. XML Declaration or DOCTYPE (Very Strong Signals)
    if (/^\s*<\?xml\s+version\s*=/i.test(trimmedContent)) {
      confidenceScore += 0.7;
      patternsMatched++;
      strongSignalFound = true;
    }
    if (/^\s*<!DOCTYPE\s+\w+/i.test(trimmedContent)) {
      confidenceScore += 0.5; // Slightly less common than XML decl but still strong
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2. Basic Tag Structure
    //    Count opening tags, closing tags, and self-closing tags.
    //    Regex for a simple opening tag: <tagname ...>
    //    Regex for a simple closing tag: </tagname>
    //    Regex for a self-closing tag: <tagname ... />
    const openingTagRegex =
      /<([a-zA-Z_][\w.-]*)(?:\s+[\w.-]+(?:=(?:"[^"]*"|'[^']*'|[^>\s]+))?)*\s*>/g;
    const closingTagRegex = /<\/([a-zA-Z_][\w.-]*)\s*>/g;
    const selfClosingTagRegex =
      /<([a-zA-Z_][\w.-]*)(?:\s+[\w.-]+(?:=(?:"[^"]*"|'[^']*'|[^>\s]+))?)*\s*\/>/g;

    const openingMatches = content.match(openingTagRegex);
    const closingMatches = content.match(closingTagRegex);
    const selfClosingMatches = content.match(selfClosingTagRegex);

    const numOpening = openingMatches ? openingMatches.length : 0;
    const numClosing = closingMatches ? closingMatches.length : 0;
    const numSelfClosing = selfClosingMatches ? selfClosingMatches.length : 0;
    const totalTags = numOpening + numClosing + numSelfClosing;

    if (totalTags > 0) {
      confidenceScore += 0.1; // Base for finding any tags
      patternsMatched++;
      if (totalTags >= 2) strongSignalFound = true; // At least one pair or two distinct tags

      // Bonus for balanced-ish tags (heuristic)
      if (
        numOpening > 0 &&
        numClosing > 0 &&
        Math.abs(numOpening - numClosing) <= numOpening * 0.5 + 1
      ) {
        confidenceScore += 0.15;
      } else if (numSelfClosing >= 2) {
        confidenceScore += 0.1;
      }
      confidenceScore += Math.min(totalTags, 20) * 0.01; // Small bonus for more tags
    }

    // 3. XML Comments <!-- ... -->
    if (/<!--[\s\S]*?-->/g.test(content)) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // 4. CDATA Sections <![CDATA[...]]>
    if (/<!\[CDATA\[[\s\S]*?]]>/g.test(content)) {
      confidenceScore += 0.15;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 5. Processing Instructions <?target ...?>
    if (
      /<\?[\w-]+[\s\S]*?\?>/g.test(content) &&
      !/<\?xml/i.test(content) /* exclude XML decl */
    ) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // 6. Namespace declarations (xmlns:)
    if (/\sxmlns(?::\w+)?\s*=\s*["'][^"']+["']/g.test(content)) {
      confidenceScore += 0.2;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 7. Anti-patterns (Reduce confidence if it looks more like other formats)
    //    Be careful as HTML is a form of XML. HTML detector should have higher priority or more specific anti-patterns.
    const antiPatterns = [
      {
        pattern: /\b(function|class|var|let|const|def|if|for|while)\s*[\({]/gi,
        weight: -0.3,
      }, // Common code keywords + block start
      { pattern: /=>|->/g, weight: -0.2 }, // Arrows not typical in XML data
      { pattern: /^package\s|System\.out\.println|#include/gi, weight: -0.5 }, // Java, C, etc.
      // If it has many lines *not* starting with < or whitespace then <, it's less likely XML
    ];

    // If no strong XML signals were found initially, apply anti-patterns more aggressively
    if (confidenceScore < 0.4) {
      for (const ap of antiPatterns) {
        if (ap.pattern.test(content)) {
          confidenceScore += ap.weight;
        }
      }
    }

    // 8. Final Adjustments and Clamping
    if (strongSignalFound && patternsMatched >= 2) {
      confidenceScore += 0.1;
    }
    if (
      trimmedContent.startsWith("<") &&
      trimmedContent.endsWith(">") &&
      totalTags >= 2
    ) {
      confidenceScore += 0.05; // General well-formedness check
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch =
      (strongSignalFound && confidenceScore >= 0.4) ||
      (patternsMatched >= 2 && confidenceScore >= 0.5);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "xml";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'xml'

    // Monaco has excellent built-in support for 'xml'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // The built-in XML formatter in Monaco (if enabled/available through its HTML services)
    // is generally good. A custom regex-based formatter for XML can be very complex
    // to do correctly due to nesting, attributes, comments, CDATA, PIs, etc.
    // The one you had is a good starting point for a heuristic indenter.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any, options: any) {
        const content = model.getValue();
        const indentChar = options.insertSpaces
          ? " ".repeat(options.tabSize)
          : "\t";
        let formattedXml = "";
        let indentLevel = 0;
        // Regex to split XML by tags, keeping delimiters. It's complex.
        // This regex tries to handle: tags, comments, PIs, CDATA, DOCTYPE
        const tagRegex =
          /(<\?xml.*?\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?]]>|<[^>]+>)/g;
        const parts = content
          .split(tagRegex)
          .filter((part: string) => part && part.trim() !== "");

        parts.forEach((part: string, index: number) => {
          const trimmedPart = part.trim();
          let currentLineIndented = false;

          if (trimmedPart.startsWith("</")) {
            // Closing tag
            indentLevel = Math.max(0, indentLevel - 1);
            formattedXml += indentChar.repeat(indentLevel) + trimmedPart + "\n";
            currentLineIndented = true;
          } else if (
            trimmedPart.startsWith("<?") ||
            trimmedPart.startsWith("<!DOCTYPE") ||
            trimmedPart.startsWith("<!--") ||
            trimmedPart.startsWith("<![CDATA[")
          ) {
            // PI, DOCTYPE, Comment, CDATA
            formattedXml += indentChar.repeat(indentLevel) + trimmedPart + "\n";
            currentLineIndented = true;
          } else if (trimmedPart.endsWith("/>")) {
            // Self-closing tag
            formattedXml += indentChar.repeat(indentLevel) + trimmedPart + "\n";
            currentLineIndented = true;
          } else if (trimmedPart.startsWith("<")) {
            // Opening tag
            formattedXml += indentChar.repeat(indentLevel) + trimmedPart + "\n";
            indentLevel++;
            currentLineIndented = true;
          } else {
            // Text content
            // Only add text if it's not just whitespace between tags that are already on new lines
            if (trimmedPart) {
              formattedXml +=
                indentChar.repeat(indentLevel) + trimmedPart + "\n";
              currentLineIndented = true;
            } else if (formattedXml.endsWith("\n\n")) {
              // Avoid adding more newlines if already double spaced
            } else if (formattedXml.endsWith("\n")) {
              // Avoid adding newline if previous part already added one and this is just whitespace
            } else if (
              part.trim() === "" &&
              index > 0 &&
              parts[index - 1].trim().endsWith(">")
            ) {
              // If it's just whitespace after a tag, don't add extra indent or newline
              // formattedXml += part; // preserve original whitespace for careful scenarios
            }
          }
        });

        // Remove leading/trailing newlines and ensure only one at the end if original had it
        formattedXml = formattedXml.trim();
        if (content.trim().length > 0 && content.endsWith("\n")) {
          formattedXml += "\n";
        }

        return [
          {
            range: model.getFullModelRange(),
            text: formattedXml,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const xmlDetector = new XmlFormatDetector();
formatRegistry.register(xmlDetector);

// Export for backward compatibility (optional)
export const registerXmlProvider = (monaco: any) => {
  xmlDetector.registerProvider(monaco);
};
