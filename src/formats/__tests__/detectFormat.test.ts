import { detectFormat, getPotentialFormatMatches } from '../index';
import { CssFormatDetector } from '../css';

describe('Format Detection', () => {
  describe('detectFormat function', () => {
    test('detects regular JSON object', () => {
      const content = '{"name": "John", "age": 30}';
      const result = detectFormat(content);

      expect(result).toBe('json');
    });

    test('detects regular JSON array', () => {
      const content = '[{"name": "John"}, {"name": "Jane"}]';
      const result = detectFormat(content);

      expect(result).toBe('json');
    });

    test('detects stringified JSON object - the failing case', () => {
      const content = '"{\\\"name\\\":\\\"John Doe\\\",\\\"age\\\":30,\\\"isStudent\\\":false,\\\"courses\\\":[{\\\"id\\\":1,\\\"name\\\":\\\"History\\\"},{\\\"id\\\":2,\\\"name\\\":\\\"Math\\\"}]}"';

      const result = detectFormat(content);
      const matches = getPotentialFormatMatches(content, 5);

      expect(result).toBe('json');
    });

    test('detects simple stringified JSON', () => {
      const content = '"{\\\"name\\\":\\\"test\\\",\\\"value\\\":123}"';

      const result = detectFormat(content);
      const matches = getPotentialFormatMatches(content, 5);

      expect(result).toBe('json');
    });

    test('prefers SVG over CSS embedded in an SVG style element', () => {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 295">
  <style>
    .wordmark {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .tagline {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      letter-spacing: 0.16em;
    }
  </style>
  <path d="M60 8 L105 34 L105 86 L60 112 Z" fill="none" stroke="#0F172A"/>
</svg>`;

      // Embedded CSS remains recognizable, but the SVG root is decisive for
      // the enclosing document's language.
      expect(new CssFormatDetector().detect(content).match).toBe(true);
      expect(detectFormat(content)).toBe('svg');
      expect(getPotentialFormatMatches(content, 5)[0].id).toBe('svg');
    });

    test('correctly identifies Properties files (regression test)', () => {
      const content = `# Database
db.url= jdbc:postgresql://localhost:5432/mydb
db.user =admin
db.password= secret
db.password= secret123   # override?

#Server
server.port=8080
 server.host = localhost
server .compression.enabled=true

# Logging
logging.level.root= INFO
logging.level.com.example=DEBUG
logging.file= /var/log/myapp/app.log

# Feature Flags
feature.newDashboard = true
 feature.experimentX=false
feature.experimentX = true   # conflicting toggle?

# Misc
 app.name=LegacyApp
app.version =1.0.0`;

      const result = detectFormat(content);
      const matches = getPotentialFormatMatches(content, 5);

      // Properties should be detected correctly (not Ruby)
      expect(result).toBe('properties');

      // Properties should be top match in ranking system
      expect(matches[0].id).toBe('properties');

      // Ensure consistency between single detection and ranking
      expect(result).toBe(matches[0].id);
    });

//     test('correctly identifies CSV content', () => {
//       const content = 'name,age,city\nJohn,30,New York\nJane,25,Boston';
//       const result = detectFormat(content);
//
//       console.log('CSV detection result:', result);
//       expect(result).toBe('csv');
//     });
  });
});
