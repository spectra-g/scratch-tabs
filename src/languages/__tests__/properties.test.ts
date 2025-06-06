import { PropertiesLanguageDetector } from '../properties';

describe('PropertiesLanguageDetector', () => {
  let detector: PropertiesLanguageDetector;

  beforeEach(() => {
    detector = new PropertiesLanguageDetector();
  });

  describe('Basic Properties', () => {
    test('should have correct basic properties', () => {
      expect(detector.id).toBe('ini');
      expect(detector.name).toBe('Properties / INI');
      expect(detector.extensions).toEqual(['properties', 'ini', 'cfg', 'conf', 'config']);
      expect(detector.priority).toBe(3);
    });

    test('should return correct file extension', () => {
      expect(detector.getFileExtension()).toBe('properties');
    });
  });

  describe('Sample Content', () => {
    test('should provide valid sample content', () => {
      const sample = detector.sampleContent();
      expect(sample).toContain('app.name = My Application');
      expect(sample).toContain('[database]');
      expect(sample).toContain('# This is a global comment');
    });
  });

  describe('Detection Logic', () => {
    test('should require more than 3 lines', () => {
      const shortContent = 'key1=value1\nkey2=value2\nkey3=value3';
      const result = detector.detect(shortContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test('should detect valid properties file with key-value pairs', () => {
      const validProperties = `# Configuration file
app.name = My Application
app.version = 1.0.3
debug_mode = true
server.port = 8080`;

      const result = detector.detect(validProperties);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test('should detect INI file with sections', () => {
      const validIni = `# Configuration
[database]
host = localhost
port = 5432
user = db_user

[app]
name = MyApp
version = 1.0`;

      const result = detector.detect(validIni);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test('should reject content with only URLs', () => {
      const urlContent = `https://example.com
https://google.com
https://github.com
https://stackoverflow.com
https://mydomain.com/path/to/page`;

      const result = detector.detect(urlContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test('should reject content with mixed URLs and properties', () => {
      const mixedContent = `app.name = MyApp
https://example.com
https://google.com
key = value
https://github.com`;

      const result = detector.detect(mixedContent);
      expect(result.match).toBe(false);
    });

    test('should reject empty or very short content', () => {
      expect(detector.detect('').match).toBe(false);
      expect(detector.detect('   ').match).toBe(false);
      expect(detector.detect('a').match).toBe(false);
      expect(detector.detect('ab').match).toBe(false);
    });

    test('should reject code-like content', () => {
      const codeContent = `function test() {
  const x = 5;
  return x + 1;
}
let y = test();
console.log(y);`;

      const result = detector.detect(codeContent);
      expect(result.match).toBe(false);
    });

    test('should reject SQL content', () => {
      const sqlContent = `SELECT name, email 
FROM users 
WHERE active = true
ORDER BY name
LIMIT 10
INSERT INTO logs VALUES ('test')`;

      const result = detector.detect(sqlContent);
      expect(result.match).toBe(false);
    });

    test('should reject HTML/XML content', () => {
      const htmlContent = `<html>
<head><title>Test</title></head>
<body>
<div>Content</div>
<p>More content</p>
</body>
</html>`;

      const result = detector.detect(htmlContent);
      expect(result.match).toBe(false);
    });

    test('should handle comments correctly', () => {
      const commentedProperties = `# Main configuration
; Alternative comment style
app.name = MyApp
# Database settings
db.host = localhost
; Port configuration
db.port = 5432`;

      const result = detector.detect(commentedProperties);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test('should detect high confidence for well-structured files', () => {
      const wellStructured = `# Application Configuration
[application]
name = MyApplication
version = 2.1.0
debug = false

[database]
host = localhost
port = 5432
username = admin
password = secret

[logging]
level = INFO
file = /var/log/app.log`;

      const result = detector.detect(wellStructured);
      

      
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test('should handle edge cases with special characters', () => {
      const edgeCaseContent = `# Config with special chars
app.path = C:\\Users\\Default\\Documents
server.port = 8080
special.chars = @#$%^&*()
unicode.text = héllo wörld
numbers.only = 12345`;

      const result = detector.detect(edgeCaseContent);
      expect(result.match).toBe(true);
    });

    test('should reject properties with URLs in values', () => {
      const propertiesWithUrl = `# Config with URL
app.name = MyApp
web.url = http://localhost:8080/app
debug = true
version = 1.0`;

      const result = detector.detect(propertiesWithUrl);
      expect(result.match).toBe(false); // URLs should cause rejection
    });
  });

  describe('Monaco Provider Registration', () => {
    test('should register monaco provider without errors', () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn()
        },
        editor: {
          defineTheme: jest.fn()
        }
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: 'ini' });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalled();
      expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    });
  });
}); 