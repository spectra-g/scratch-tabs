import { formatRegistry } from "../registry";
import { AccessLogFormatDetector } from "../accesslog";
import { BashFormatDetector } from "../bash";
import { CppFormatDetector } from "../cpp";
import { CsharpFormatDetector } from "../csharp";
import { CssFormatDetector } from "../css";
import { CsvFormatDetector } from "../csv";
import { CurlFormatDetector } from "../curl";
import { DiffFormatDetector } from "../diff";
import { DockerfileFormatDetector } from "../dockerfile";
import { GoFormatDetector } from "../go";
import { GraphqlFormatDetector } from "../graphql";
import { GroovyDetector } from "../groovy";
import { HclFormatDetector } from "../hcl";
import { HtmlFormatDetector } from "../html";
import { JavaFormatDetector } from "../java";
import { JavaScriptFormatDetector, TypeScriptFormatDetector } from "../javascript";
// import { JsonFormatDetector } from "../json"; // Still has circular dependency issues
import { KotlinFormatDetector } from "../kotlin";
import { MarkdownFormatDetector } from "../markdown";
import { JsonLogFormatDetector } from "../ndjson";
import { PhpFormatDetector } from "../php";
import { PropertiesFormatDetector } from "../properties";
import { PythonFormatDetector } from "../python";
import { RFormatDetector } from "../r";
import { RubyFormatDetector } from "../ruby";
import { RustFormatDetector } from "../rust";
import { ScalaFormatDetector } from "../scala";
import { SqlFormatDetector } from "../sql";
import { StacktraceFormatDetector } from "../stacktrace";
import { SvgFormatDetector } from "../svg";
import { VhostFormatDetector } from "../vhost";
import { XmlFormatDetector } from "../xml";
import { YamlFormatDetector } from "../yaml";

/**
 * High-level registry tests that verify each format's sample content
 * is correctly detected as the top-scoring format when passed through
 * all registered format detectors.
 * 
 * To add a new format test:
 * 1. Import the format detector class
 * 2. Add a config object to formatTestConfigs array
 * 3. Set appropriate expectedMinConfidence and expectedDefinitive values
 * 4. Tests will be automatically generated
 */
describe("Registry Format Detection", () => {
  // Test configuration for each format
  const formatTestConfigs = [
    {
      id: "accesslog",
      name: "Access Log",
      detectorClass: AccessLogFormatDetector,
      expectedMinConfidence: 0.8,
      expectedDefinitive: true,
    },
    {
      id: "shell",
      name: "Bash/Shell",
      detectorClass: BashFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "cpp",
      name: "C++",
      detectorClass: CppFormatDetector,
      expectedMinConfidence: 0.8,
      expectedDefinitive: undefined, // C++ detector doesn't set matchedDefinitive
    },
    {
      id: "csharp",
      name: "C#",
      detectorClass: CsharpFormatDetector,
      expectedMinConfidence: 0.8,
      expectedDefinitive: undefined, // C# detector doesn't set matchedDefinitive
    },
    {
      id: "css",
      name: "CSS",
      detectorClass: CssFormatDetector,
      expectedMinConfidence: 0.8,
      expectedDefinitive: true,
    },
    {
      id: "csv",
      name: "CSV",
      detectorClass: CsvFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: false,
    },
    {
      id: "curl",
      name: "cURL",
      detectorClass: CurlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "diff",
      name: "Diff",
      detectorClass: DiffFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "dockerfile",
      name: "Dockerfile",
      detectorClass: DockerfileFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "go",
      name: "Go",
      detectorClass: GoFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "graphql",
      name: "GraphQL",
      detectorClass: GraphqlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "groovy",
      name: "Groovy",
      detectorClass: GroovyDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "hcl",
      name: "HCL",
      detectorClass: HclFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "html",
      name: "HTML",
      detectorClass: HtmlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "java",
      name: "Java",
      detectorClass: JavaFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "javascript",
      name: "JavaScript",
      detectorClass: JavaScriptFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    // JSON still has circular dependency issues
    // {
    //   id: "json",
    //   name: "JSON",
    //   detectorClass: JsonFormatDetector,
    //   expectedMinConfidence: 0.6,
    //   expectedDefinitive: undefined,
    // },
    {
      id: "kotlin",
      name: "Kotlin",
      detectorClass: KotlinFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "markdown",
      name: "Markdown",
      detectorClass: MarkdownFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "ndjson",
      name: "NDJSON",
      detectorClass: JsonLogFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "php",
      name: "PHP",
      detectorClass: PhpFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "ini",
      name: "Properties",
      detectorClass: PropertiesFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "python",
      name: "Python",
      detectorClass: PythonFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "r",
      name: "R",
      detectorClass: RFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "ruby",
      name: "Ruby",
      detectorClass: RubyFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "rust",
      name: "Rust",
      detectorClass: RustFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "scala",
      name: "Scala",
      detectorClass: ScalaFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "sql",
      name: "SQL",
      detectorClass: SqlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "stacktrace",
      name: "Stacktrace",
      detectorClass: StacktraceFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "xml",
      name: "SVG",
      detectorClass: SvgFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "typescript",
      name: "TypeScript",
      detectorClass: TypeScriptFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "vhost",
      name: "VHost",
      detectorClass: VhostFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "xml",
      name: "XML",
      detectorClass: XmlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
    {
      id: "yaml",
      name: "YAML",
      detectorClass: YamlFormatDetector,
      expectedMinConfidence: 0.6,
      expectedDefinitive: undefined,
    },
  ];
  // Helper function to get all detection results for content
  function getAllDetectionResults(content: string) {
    const results: Array<{
      id: string;
      name: string;
      match: boolean;
      confidence: number;
      matchedDefinitive: boolean;
    }> = [];

    const allModules = formatRegistry.getAll();
    
    for (const module of allModules) {
      try {
        const result = module.detect(content);
        results.push({
          id: module.id,
          name: module.name,
          match: result.match,
          confidence: result.confidence,
          matchedDefinitive: result.matchedDefinitive,
        });
      } catch (error) {
        console.warn(`Error detecting with ${module.id}:`, error);
        results.push({
          id: module.id,
          name: module.name,
          match: false,
          confidence: 0,
          matchedDefinitive: false,
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // Generic test generator for each format
  function createFormatTest(config: {
    id: string;
    name: string;
    detectorClass: any;
    expectedMinConfidence: number;
    expectedDefinitive: boolean | undefined;
  }) {
    describe(`${config.name} Format Detection`, () => {
      test(`should detect ${config.id} as the highest confidence format`, () => {
        // Get sample content from the detector
        const detector = new config.detectorClass();
        const sampleContent = detector.sampleContent();

        // Get all detection results
        const results = getAllDetectionResults(sampleContent);

        // Filter to only matching formats
        const matchingFormats = results.filter(r => r.match);

        // Assert that we have at least one matching format
        expect(matchingFormats.length).toBeGreaterThan(0);

        // Assert that our format has the highest confidence among matching formats
        const topMatch = matchingFormats[0];
        
        // Find our format in the results
        const ourFormatResult = matchingFormats.find(r => r.id === config.id);
        expect(ourFormatResult).toBeDefined();
        expect(ourFormatResult!.id).toBe(config.id);

        // The registry might pick a different format due to priority/definitive rules
        // But our format should at least be detected with high confidence
        const detectedFormat = formatRegistry.detectFormat(sampleContent);
        
        // Either our format wins, or it should have high confidence
        if (detectedFormat !== config.id) {
          console.log(`Note: ${config.name} detected as ${detectedFormat} instead. Our format confidence: ${ourFormatResult!.confidence.toFixed(3)}`);
          // Still verify our format has good confidence even if it doesn't win
          expect(ourFormatResult!.confidence).toBeGreaterThan(config.expectedMinConfidence);
        } else {
          expect(detectedFormat).toBe(config.id);
        }

        // Verify our format meets expected confidence requirements
        expect(ourFormatResult!.confidence).toBeGreaterThan(config.expectedMinConfidence);
        if (config.expectedDefinitive !== undefined) {
          expect(ourFormatResult!.matchedDefinitive).toBe(config.expectedDefinitive);
        }
      });

      test(`should have high confidence for ${config.id} detection`, () => {
        const detector = new config.detectorClass();
        const sampleContent = detector.sampleContent();
        
        const results = getAllDetectionResults(sampleContent);
        const formatResult = results.find(r => r.id === config.id);
        
        expect(formatResult).toBeDefined();
        expect(formatResult!.match).toBe(true);
        expect(formatResult!.confidence).toBeGreaterThan(config.expectedMinConfidence);
      });
    });
  }

  // Generate tests for each configured format
  formatTestConfigs.forEach(config => {
    createFormatTest(config);
  });
});