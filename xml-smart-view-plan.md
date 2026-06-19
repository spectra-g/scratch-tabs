# XML Smart View Implementation Plan

## Goal

Make Scratch Tabs the best offline XML inspection and transformation tool: private by default, fast enough for real-world XML, and deeper than generic online formatters. The smart view should cover the daily XML workflow end to end: understand, validate, query, transform, compare, convert, and extract without uploading data anywhere.

## Research Summary

XML users are poorly served by simple "beautify and validate" websites. Professional XML tools such as Oxygen XML Editor, XMLSpy, Stylus Studio, and XMLStarlet show that serious XML work needs several capabilities together:

- Synchronized text, tree, and grid/table views.
- Well-formedness errors with actionable location and context.
- XPath query execution with namespace handling.
- Schema validation for XSD, DTD, RELAX NG, and Schematron where feasible.
- XSLT transformation support.
- XML-aware diff, canonicalization, and normalization.
- Large-document navigation that does not require expanding the whole tree.
- Format-specific awareness for RSS, Atom, SOAP, WSDL, Maven POM, plist, KML, GPX, draw.io, Office XML, and build/project XML files.

Browser APIs provide a strong offline base. `DOMParser.parseFromString()` can parse XML into an isolated document and exposes parser errors through `parsererror` nodes. `XPathEvaluator` can evaluate XPath expressions locally. The W3C XPath model is built around selecting parts of an XML document tree and includes namespace-aware node names, which must be treated as a core concern rather than an edge case.

Sources:

- MDN DOMParser `parseFromString`: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
- MDN XPathEvaluator: https://developer.mozilla.org/en-US/docs/Web/API/XPathEvaluator
- W3C XPath 1.0 Recommendation: https://www.w3.org/TR/1999/REC-xpath-19991116/
- XML editor feature overview: https://en.wikipedia.org/wiki/XML_editor
- Oxygen XML Editor feature overview: https://en.wikipedia.org/wiki/Oxygen_XML_Editor
- Stylus Studio XML editor feature overview: https://en.wikipedia.org/wiki/Stylus_Studio
- XMLStarlet feature overview: https://en.wikipedia.org/wiki/XMLStarlet
- XML Schema / XSD background: https://en.wikipedia.org/wiki/XML_Schema_%28W3C%29
- XSLT background: https://en.wikipedia.org/wiki/XSLT

## User Pain Points To Solve

1. Raw XML is hard to scan.
   Deeply nested XML, repeated nodes, verbose namespaces, and mixed content make raw text hard to understand even when it is formatted.

2. Online XML tools are risky.
   XML often contains customer data, SOAP payloads, CI artifacts, internal service URLs, SAML assertions, Maven coordinates, device telemetry, or Office document internals. Uploading those to a formatter or validator is a privacy failure.

3. Parser errors are usually cryptic.
   Users need exact line/column, nearby source context, likely cause, and a jump-to-error action.

4. Namespaces make XPath painful.
   Many XPath testers fail because users do not know which prefixes are in scope, or because the document uses a default namespace. The tool must discover namespaces and help build valid expressions.

5. Schema validation is fragmented.
   Users frequently have XML plus an XSD/DTD somewhere else, or a schema reference in the document that cannot be fetched offline. They need clear local validation flows and understandable errors.

6. Repeating XML data wants a table.
   RSS items, test reports, Maven dependencies, GPX points, KML placemarks, SOAP result rows, and app config entries are much easier in a grid than in a tree.

7. XML transformations are scattered across tools.
   People need XML to JSON, JSON-like tree inspection, XPath extraction, XSLT preview, canonicalization, minification, and attribute sorting in one local place.

8. Large XML files are brittle in browser tools.
   Big logs, sitemaps, test reports, and generated exports need lazy rendering, search-first navigation, and guardrails before expensive operations.

9. XML diffs are noisy.
   Whitespace, attribute order, namespace prefixes, comments, and formatting changes can obscure real structural differences.

10. XML subformats need domain-specific summaries.
    A Maven POM, RSS feed, GPX route, plist file, SOAP envelope, WSDL document, and draw.io file are all XML, but users want different answers from each.

## Product Scope

### Core Smart View

Add an XML smart view registered by `src/formats/xml/index.ts`, following the existing `YamlSmartView`, `TomlSmartView`, and `JsonSmartView` patterns.

Primary layout:

- Left panel: searchable tree explorer.
- Center panel: Monaco XML editor.
- Right panel: selected node details and tools.
- Bottom or collapsible panel: diagnostics, XPath results, validation results, and transform output.

The UI should stay dense and work-focused. XML is operational tooling, not a marketing surface.

### Tool 1: Structure Explorer

Required:

- Lazy expandable XML tree.
- Node type badges: element, attribute, text, CDATA, comment, processing instruction, doctype.
- Namespace prefix and URI display.
- Attribute count, child count, text length, and line range.
- Mixed-content indicator.
- Empty element indicator.
- Search by element name, attribute name, attribute value, text content, namespace URI, and XPath-like path.
- Click tree node to reveal and select the source range in Monaco.
- Cursor movement in Monaco syncs the selected tree node.
- Breadcrumb path for selected node.
- Copy options: node XML, inner XML, text content, XPath, Clark notation path, CSS-like path where possible.

Implementation notes:

- Start with `DOMParser` for correctness and browser-native behavior.
- Build an internal `XmlNode` model with stable ids, parent ids, namespace metadata, attributes, text summary, and approximate source ranges.
- Source ranges may require a lightweight tokenizer because DOM nodes do not retain line/column offsets.

### Tool 2: Formatting, Minify, Normalize

Required:

- Pretty print with configurable indentation.
- Minify while preserving semantic text nodes.
- Sort attributes option.
- Normalize line endings.
- Remove insignificant whitespace option with a warning for mixed-content documents.
- Strip comments option.
- Collapse empty elements option.
- Expand self-closing elements option.
- Preserve or rewrite XML declaration.
- Preserve CDATA by default.

Advanced:

- Canonical XML-inspired output mode for stable diffs.
- Namespace prefix normalization preview.
- Attribute quote style control if the existing formatter supports it safely.

### Tool 3: Well-Formedness Diagnostics

Required:

- Parse status summary.
- Error message with line/column where available.
- Source excerpt around error.
- Jump to error.
- Common-cause hints:
  - unclosed tag
  - mismatched closing tag
  - unescaped ampersand
  - invalid character
  - duplicate attribute
  - multiple root elements
  - malformed CDATA
  - namespace prefix not bound

Advanced:

- Best-effort recovery tree for malformed XML, disabled by default and clearly marked as approximate.

### Tool 4: XPath Workbench

Required:

- XPath input with history.
- Evaluate against current document using `XPathEvaluator`.
- Namespace resolver populated from discovered namespaces.
- Default namespace helper that assigns a generated prefix for XPath use.
- Result types:
  - node set
  - string
  - number
  - boolean
- Highlight matching nodes in Monaco and the tree.
- Result table with node type, name, value preview, path, line, and actions.
- Copy result values as text, JSON array, CSV, or XML fragments.
- Generate XPath for selected node.
- Quick XPath templates:
  - all elements by name
  - elements with attribute
  - attribute value equals
  - contains text
  - count nodes
  - distinct-ish attribute values via local JS post-processing

Advanced:

- XPath explain mode: break an expression into steps and show match counts per step.
- XPath snippets per detected XML subformat.

### Tool 5: Schema Validation

Required first version:

- Detect schema references:
  - `xsi:schemaLocation`
  - `xsi:noNamespaceSchemaLocation`
  - `DOCTYPE`
- Explain which schemas are referenced and whether they are local, remote, or unavailable offline.
- Allow user to choose another open tab as XSD/DTD/schema input.
- Validate well-formedness before schema validation.
- Show schema diagnostics in a grouped list with source jumps where possible.

Dependency options to evaluate:

- XSD validation in browser via a WASM/libxml2-based package if bundle size and licensing are acceptable.
- DTD validation may be limited initially because browser `DOMParser` does not perform full validating-parser behavior.
- RELAX NG and Schematron should be planned as advanced add-ons unless a small, maintainable offline package exists.

Advanced:

- XSD structure viewer: global elements, complex types, simple types, attributes, imports/includes.
- Generate starter XSD from XML sample.
- Generate sample XML from XSD.
- Show required vs optional children for selected element when schema is loaded.

### Tool 6: XML-Aware Diff

Required:

- Compare current XML with another tab.
- Formatting-insensitive diff.
- Attribute-order-insensitive diff.
- Optional ignore comments, processing instructions, and whitespace-only text nodes.
- Show structural differences by path:
  - added node
  - removed node
  - changed text
  - changed attribute
  - namespace change
  - order change
- Open a side-by-side Monaco diff for source-level detail.

Advanced:

- Canonicalized diff mode.
- Reorder-tolerant comparison for repeated elements using key attributes such as `id`, `name`, `key`, `code`, `href`, or user-selected key.

### Tool 7: Conversion and Extraction

Required:

- Convert XML to JSON with options:
  - preserve attributes under configurable key, default `@attributes`
  - preserve text under configurable key, default `#text`
  - preserve CDATA under configurable key, default `#cdata`
  - preserve comments optional
  - array handling: always arrays, repeated-only arrays, or compact
  - namespace handling: keep prefixes, Clark notation, or local names only
- Convert selected subtree to JSON.
- Convert XPath results to:
  - text list
  - JSON array
  - CSV
  - new XML document
- Generate TypeScript interface from inferred XML-to-JSON shape.

Advanced:

- Convert XML to YAML/TOML when shape permits.
- Convert simple repeated elements to CSV.
- Generate sample XPath extraction pipeline operation.

### Tool 8: XSLT Transform Preview

Required:

- Choose XSLT from another tab or paste into a split panel.
- Run browser-native XSLT 1.0 where supported.
- Show output as XML, HTML preview, or text depending on result.
- Show transform errors clearly.
- Never inject transformed HTML into the app unsanitized.

Advanced:

- Optional Saxon-JS or similar support for XSLT 2.0/3.0 if licensing, bundle size, and offline behavior are acceptable.
- Transformation scenarios saved per workspace.

### Tool 9: Domain-Specific XML Inspectors

These should layer on top of the generic XML smart view using detector functions. They do not need separate format ids at first.

High-value subformats:

- RSS / Atom: feed title, links, item count, latest items, missing GUIDs, dates, enclosures.
- Maven POM: coordinates, parent, modules, dependencies, dependencyManagement, plugins, properties, repositories.
- SOAP envelope: headers, body operation, fault details, namespaces, extracted payload.
- WSDL: services, ports, bindings, operations, messages, schema imports.
- XSD: elements, types, attributes, imports/includes, target namespace.
- JUnit / xUnit XML: suite summary, failed tests, skipped tests, durations, failure messages.
- plist: keys, value types, bundle metadata, permission strings.
- KML / GPX: placemarks/routes/tracks, coordinate counts, bounds, export coordinates.
- SVG: defer to existing SVG smart view where detected as SVG, but link from XML if appropriate.
- draw.io: diagram pages, compressed payload detection, page extraction.
- Office Open XML parts: when XML comes from an archive inspector later, summarize relationships and content types.
- Android manifest: package, permissions, activities, services, receivers, SDK levels.
- .NET project files: target frameworks, package references, project references, properties.

### Tool 10: Security and Privacy Checks

Required:

- Flag external entity declarations and explain XXE risk.
- Flag remote schema URLs and note that Scratch Tabs will not fetch them automatically.
- Flag embedded secrets using existing secret-scanner logic if reusable.
- Flag base64-looking large text nodes and offer decode-to-new-tab.
- Flag SAML/JWT/token-looking values and offer local inspection.
- Flag potentially dangerous transformed HTML output before preview.

Advanced:

- Privacy summary: "Processed locally. No network requests made for schema or transform resources."
- Network activity badge if the broader app network monitor is later implemented.

### Tool 11: Large File Mode

Required:

- Size and node-count thresholds.
- Disable eager full-tree expansion beyond threshold.
- Show top-level outline first.
- Search indexes built lazily or in a Web Worker.
- Warn before XPath queries likely to scan the whole document.
- Limit text previews for huge nodes.

Advanced:

- Streaming token index for files too large for DOM.
- Worker-based parsing and tree model construction.
- Virtualized tree and result lists.

## Technical Architecture

### Files To Add

- `src/formats/xml/views/XmlSmartView.tsx`
- `src/formats/xml/views/components/XmlToolbar.tsx`
- `src/formats/xml/views/components/XmlTreeView.tsx`
- `src/formats/xml/views/components/XmlNodeDetails.tsx`
- `src/formats/xml/views/components/XPathWorkbench.tsx`
- `src/formats/xml/views/components/XmlDiagnosticsPanel.tsx`
- `src/formats/xml/views/components/XmlConversionPanel.tsx`
- `src/formats/xml/views/components/XmlValidationPanel.tsx`
- `src/formats/xml/views/hooks/useXmlData.ts`
- `src/formats/xml/views/hooks/useXPath.ts`
- `src/formats/xml/views/hooks/useXmlDiagnostics.ts`
- `src/formats/xml/views/types.ts`
- `src/formats/xml/utils/xmlParser.ts`
- `src/formats/xml/utils/xmlTokenizer.ts`
- `src/formats/xml/utils/xmlFormatter.ts`
- `src/formats/xml/utils/xmlPath.ts`
- `src/formats/xml/utils/xmlToJson.ts`
- `src/formats/xml/utils/xmlDiff.ts`
- `src/formats/xml/utils/xmlSubformats.ts`
- `src/formats/xml/utils/xmlSecurity.ts`

### Files To Modify

- `src/formats/xml/index.ts`
  - Register smart view with `smartViewRegistry`.
  - Add `SmartViewButtons` status bar item.

- `src/formats/xml.ts`
  - Keep existing detection.
  - Consider adding sub-detection metadata later, but avoid breaking the base XML detector.

- `src/services/pipeline/operations/xml.ts`
  - Add or align reusable operations: format, minify, XPath, XML-to-JSON, canonicalize.

### Data Model

```ts
export type XmlNodeKind =
  | "document"
  | "element"
  | "attribute"
  | "text"
  | "cdata"
  | "comment"
  | "processing-instruction"
  | "doctype";

export interface XmlSourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startOffset: number;
  endOffset: number;
}

export interface XmlNamespaceInfo {
  prefix: string;
  uri: string;
  declaredOnPath: string;
  generatedPrefix?: boolean;
}

export interface XmlNodeInfo {
  id: string;
  kind: XmlNodeKind;
  name: string;
  localName: string;
  prefix: string | null;
  namespaceUri: string | null;
  path: string;
  xpath: string;
  attributes: XmlAttributeInfo[];
  children: XmlNodeInfo[];
  valuePreview: string;
  textLength: number;
  range?: XmlSourceRange;
  hasMixedContent: boolean;
}
```

### Parser Strategy

Phase 1 should use `DOMParser` for browser-native parsing and correctness. Add a tokenizer alongside it to recover source ranges, comments, CDATA, processing instructions, declaration metadata, and doctype locations. The tokenizer should not be the source of truth for XML validity.

Phase 2 should evaluate worker parsing and optional SAX-style parsing for large documents.

### Testing

Unit tests:

- Well-formed XML.
- Malformed XML and parser error extraction.
- Namespaces, including default namespace.
- Attributes with escaped values.
- CDATA, comments, processing instructions, doctype.
- Mixed content.
- XPath evaluation and namespace resolver behavior.
- XML-to-JSON conversion options.
- Formatter preserves semantic content.
- Security warnings.
- Subformat detectors for RSS, POM, SOAP, WSDL, XSD, JUnit, plist, KML, GPX.

Component tests:

- Tree renders and filters.
- Selecting tree node updates Monaco cursor.
- XPath results highlight tree nodes.
- Conversion actions create background tabs.
- Diagnostics panel jumps to line.

E2E tests:

- Open XML sample, switch to smart view, inspect tree, run XPath, convert selected nodes.
- Malformed XML displays actionable error.
- Namespaced SOAP XML query works with generated prefix.
- Large-file threshold shows large-file mode instead of freezing.

## Phased Delivery

### Phase 1: Best Offline XML Inspector

Ship:

- Smart view registration.
- Tree explorer.
- Node details.
- Parser diagnostics.
- Formatting/minify.
- Search.
- Copy node/path/text actions.
- XML-to-JSON conversion.
- Tests for parser, tree, diagnostics, and conversion.

This phase alone should beat simple online XML viewers because it is private, integrated with Monaco, and gives a real structural inspector.

### Phase 2: XPath and Namespace Workbench

Ship:

- XPath input and result table.
- Namespace discovery and generated prefixes.
- Highlight matches in editor and tree.
- XPath generation for selected nodes.
- Export XPath results.

This is the highest leverage expert feature because XPath is the natural query language for XML and namespaces are the place most tools frustrate users.

### Phase 3: XML-Aware Diff and Domain Summaries

Ship:

- XML-aware compare with normalization options.
- RSS/Atom, Maven POM, SOAP, WSDL, XSD, JUnit, plist, KML, GPX summaries.
- Repeated-element grid view for domain summaries.

This makes the smart view useful for real artifacts, not just generic XML.

### Phase 4: Validation and Transform Power Tools

Ship:

- Schema reference detection.
- XSD validation using an evaluated offline dependency.
- XSD structure viewer.
- Browser-native XSLT 1.0 preview.
- Optional generated XSD from sample XML.

This moves the product toward desktop-class XML tooling.

### Phase 5: Large XML and Advanced Offline Engine

Ship:

- Worker parsing.
- Virtualized tree.
- Lazy search index.
- Large-file XPath guardrails.
- Optional streaming parser for huge files.

This makes the tool reliable on generated exports, logs, sitemaps, and CI artifacts.

## Non-Goals For The First Release

- Full XSD 1.1 compliance.
- XSLT 2.0/3.0 unless a suitable offline dependency is approved.
- Automatic network fetching of schemas or stylesheets.
- Visual schema diagram editor.
- XML editing forms or WYSIWYG authoring.
- Replacing Monaco's native XML editing features.

## Acceptance Criteria For "Number One Offline XML Tool"

- Works entirely offline for the core workflow.
- Never fetches external schemas, DTDs, entities, or stylesheets without explicit user action.
- Handles namespaces as a first-class feature.
- Gives useful diagnostics for broken XML.
- Makes repeated XML data readable in a tree and grid.
- Runs XPath locally and makes results exportable.
- Converts XML to JSON with predictable, configurable semantics.
- Offers XML-aware diff that ignores irrelevant formatting noise.
- Recognizes common XML subformats and answers their domain-specific questions.
- Keeps large documents responsive through lazy rendering and worker-backed parsing.
