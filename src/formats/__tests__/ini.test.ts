import { IniFormatDetector } from "../ini";
import { TomlFormatDetector } from "../toml";

describe("IniFormatDetector", () => {
  let detector: IniFormatDetector;
  let tomlDetector: TomlFormatDetector;

  beforeEach(() => {
    detector = new IniFormatDetector();
    tomlDetector = new TomlFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("ini");
      expect(detector.name).toBe("INI");
      expect(detector.extensions).toEqual(["ini", "cfg", "conf", ".gitconfig"]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("ini");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("[database]");
      expect(sample).toContain("[application]");
      expect(sample).toContain("host = localhost");
      expect(sample).toContain("# INI Configuration File");
    });
  });

  describe("Detection Logic", () => {
    test("should require more than 2 lines", () => {
      const shortContent = "[section]\nkey1=value1";
      const result = detector.detect(shortContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should detect standard INI file with sections", () => {
      const standardIni = `# Configuration
[database]
host = localhost
port = 5432
user = db_user

[application]
name = MyApp
version = 1.0.0
debug = false`;

      const result = detector.detect(standardIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("ranks INI section-based content above TOML", () => {
      const iniContent = `[database]
host = localhost
port = 5432

[application]
debug = false`;

      const iniResult = detector.detect(iniContent);
      const tomlResult = tomlDetector.detect(iniContent);

      expect(iniResult.match).toBe(true);
      expect(iniResult.confidence).toBeGreaterThan(tomlResult.confidence);
    });

    test("ranks TOML-specific constructs above INI", () => {
      const tomlContent = `title = "Scratch Tabs"

[[service.instances]]
name = "api"
server.host = "localhost"`;

      const iniResult = detector.detect(tomlContent);
      const tomlResult = tomlDetector.detect(tomlContent);

      expect(tomlResult.match).toBe(true);
      expect(tomlResult.confidence).toBeGreaterThan(iniResult.confidence);
    });

    test("should REJECT Java-style properties file with no sections", () => {
      const propertiesContent = `# Java properties file
app.name = My Application
app.version = 1.0.3
database.host = localhost
database.port = 5432
server.debug = true
logging.level = INFO`;

      const result = detector.detect(propertiesContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle both # and ; comments", () => {
      const commentedIni = `# Hash comment
; Semicolon comment
[section1]
key1 = value1

[section2]
; Another comment
key2 = value2
# Mixed comments
key3 = value3`;

      const result = detector.detect(commentedIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "name": "MyApp",
  "version": "1.0.0",
  "database": {
    "host": "localhost",
    "port": 5432
  },
  "settings": {
    "debug": true
  }
}`;

      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should reject XML content", () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <database>
    <host>localhost</host>
    <port>5432</port>
  </database>
  <application>
    <name>MyApp</name>
    <version>1.0.0</version>
  </application>
</configuration>`;

      const result = detector.detect(xmlContent);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript content", () => {
      const jsContent = `const config = {
  database: {
    host: 'localhost',
    port: 5432
  },
  application: {
    name: 'MyApp',
    version: '1.0.0'
  }
};

function getConfig() {
  return config;
}

export default config;`;

      const result = detector.detect(jsContent);
      expect(result.match).toBe(false);
    });

    test("should reject empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("a").match).toBe(false);
      expect(detector.detect("ab").match).toBe(false);
    });

    test("should handle .gitconfig style INI files", () => {
      const gitConfigContent = `[user]
	name = John Doe
	email = john@example.com

[core]
	editor = vim
	autocrlf = true

[alias]
	st = status
	co = checkout
	br = branch
	ci = commit

[remote "origin"]
	url = https://github.com/user/repo.git
	fetch = +refs/heads/*:refs/remotes/origin/*`;

      const result = detector.detect(gitConfigContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect high confidence for well-structured INI files", () => {
      const wellStructuredIni = `# Application Configuration File
[database]
host = localhost
port = 5432
username = admin
password = secret
timeout = 30

[logging]
level = INFO
file = /var/log/app.log
max_size = 10MB
rotate = true

[features]
feature_a = enabled
feature_b = disabled
experimental = false`;

      const result = detector.detect(wellStructuredIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should handle sections with special characters", () => {
      const specialCharIni = `[section with spaces]
key1 = value1

[section-with-dashes]
key2 = value2

[section_with_underscores]
key3 = value3

[section.with.dots]
key4 = value4`;

      const result = detector.detect(specialCharIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should penalize key-value pairs before first section", () => {
      const preferenceSectionContent = `# Some config
global_key = global_value
another_global = value

[section1]
key1 = value1

[section2]
key2 = value2`;

      const result = detector.detect(preferenceSectionContent);
      expect(result.match).toBe(true);
      // Confidence should be lower due to penalty for pre-section key-values
      expect(result.confidence).toBeLessThan(0.8);
    });

    test("should handle both = and : delimiters", () => {
      const mixedDelimitersIni = `[section1]
key1 = value1
key2: value2

[section2]
key3 = value with equals
key4: value with colon`;

      const result = detector.detect(mixedDelimitersIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject content with URLs", () => {
      const urlContent = `[section]
url1 = https://example.com
url2 = http://google.com
normal_key = normal_value`;

      const result = detector.detect(urlContent);
      expect(result.match).toBe(false);
    });

    test("should reject SQL-like content", () => {
      const sqlContent = `SELECT name, value 
FROM configuration 
WHERE section = 'database'
ORDER BY name
LIMIT 10`;

      const result = detector.detect(sqlContent);
      expect(result.match).toBe(false);
    });

    test("should reject code-like content", () => {
      const codeContent = `function parseIni(content) {
  const sections = {};
  let currentSection = null;
  
  for (const line of content.split('\\n')) {
    if (line.startsWith('[')) {
      currentSection = line.slice(1, -1);
      sections[currentSection] = {};
    }
  }
  return sections;
}`;

      const result = detector.detect(codeContent);
      expect(result.match).toBe(false);
    });

    test("should handle edge case with only sections and no key-value pairs", () => {
      const onlySectionsContent = `[section1]

[section2]

[section3]`;

      const result = detector.detect(onlySectionsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "ini" });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalled();
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalled();
    });
  });
});
