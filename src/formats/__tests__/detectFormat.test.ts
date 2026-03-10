import { detectFormat, getPotentialFormatMatches } from '../index';

describe('Format Detection', () => {
  describe('detectFormat function', () => {
    describe('TOML acceptance (STORY-012)', () => {
      const canonicalToml = `# App configuration
title = "Scratch Tabs"
enabled = true
retry_count = 3

[server]
host = "localhost"
port = 3000

[database]
ports = [ 8001, 8001, 8002 ]
connection_max = 5000
enabled = true

[[users]]
name = "Alice"
role = "admin"

[[users]]
name = "Bob"
role = "viewer"`;

      test('AC-001: detectFormat returns toml for canonical TOML content', () => {
        const detectedId = detectFormat(canonicalToml);
        const matches = getPotentialFormatMatches(canonicalToml, 5);

        expect(detectedId).toBe('toml');
        expect(matches[0].id).toBe('toml');
        expect(matches[0].score).toBeGreaterThanOrEqual(0.95);
      });

      test('AC-002: getPotentialFormatMatches ranks toml first', () => {
        const matches = getPotentialFormatMatches(canonicalToml, 5);

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].id).toBe('toml');
      });

      test('AC-003: TOML module is present in public registry flow', () => {
        const matches = getPotentialFormatMatches(canonicalToml, 20);
        expect(matches.some((match) => match.id === 'toml')).toBe(true);
      });
    });

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
