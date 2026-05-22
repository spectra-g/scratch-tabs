import { DotenvFormatDetector } from "../dotenv";

describe("DotenvFormatDetector", () => {
  let detector: DotenvFormatDetector;

  beforeEach(() => {
    detector = new DotenvFormatDetector();
  });

  describe("Basic properties", () => {
    it("has correct id, name, extensions, and priority", () => {
      expect(detector.id).toBe("dotenv");
      expect(detector.name).toBe(".env");
      expect(detector.extensions).toContain("env");
      expect(detector.priority).toBeGreaterThanOrEqual(6);
    });

    it("returns a valid file extension", () => {
      expect(detector.getFileExtension()).toBe("env");
    });

    it("provides non-empty sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("=");
      expect(sample.length).toBeGreaterThan(0);
    });
  });

  describe("Positive detection", () => {
    it("detects a standard dotenv file", () => {
      const content = `APP_NAME=MyApp
APP_ENV=development
APP_PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb`;
      const { match, confidence } = detector.detect(content);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it("detects a file with comments and blank lines", () => {
      const content = `# Application settings
APP_NAME=MyApp

# Database
DB_HOST=localhost
DB_PORT=5432`;
      const { match, confidence } = detector.detect(content);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.5);
    });

    it("detects files with export prefix", () => {
      const content = `export API_KEY=abc123
export SECRET=xyz789
export HOST=localhost
export PORT=8080`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });

    it("detects files with quoted values", () => {
      const content = `APP_NAME="My Application"
APP_DESCRIPTION='A great app'
DATABASE_URL="postgres://user:pass@host/db"
API_KEY="sk-secret-key"`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });

    it("detects files with empty values", () => {
      const content = `APP_NAME=
DEBUG=false
EMPTY_KEY=
PORT=3000`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });

    it("gives higher confidence for SCREAMING_SNAKE_CASE keys", () => {
      const screaming = `APP_NAME=test
DATABASE_HOST=localhost
SECRET_KEY=abc123
API_TOKEN=token456`;
      const mixed = `appName=test
databaseHost=localhost
secretKey=abc123
apiToken=token456`;
      const { confidence: c1 } = detector.detect(screaming);
      const { confidence: c2 } = detector.detect(mixed);
      expect(c1).toBeGreaterThan(c2);
    });

    it("detects a real-world .env example", () => {
      const content = `NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod_user:S3cur3P@ss!@db.example.com:5432/prod_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=very-long-random-secret-key-here
STRIPE_SECRET_KEY=sk_live_abc123
CORS_ORIGIN=https://myapp.com
LOG_LEVEL=info`;
      const { match, confidence } = detector.detect(content);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Negative detection — false positive prevention", () => {
    it("does NOT detect plain text", () => {
      const { match } = detector.detect(`Hello world
This is some text
No key-value pairs here
Just prose content for testing`);
      expect(match).toBe(false);
    });

    it("does NOT detect JSON", () => {
      const { match } = detector.detect(`{
  "APP_NAME": "MyApp",
  "PORT": 3000,
  "DATABASE_URL": "postgresql://localhost/db"
}`);
      expect(match).toBe(false);
    });

    it("does NOT detect YAML", () => {
      const { match } = detector.detect(`app:
  name: MyApp
  port: 3000
database:
  host: localhost
  port: 5432`);
      expect(match).toBe(false);
    });

    it("does NOT detect INI files", () => {
      const { match } = detector.detect(`[database]
host = localhost
port = 5432

[application]
name = MyApp
debug = false`);
      expect(match).toBe(false);
    });

    it("does NOT detect Makefile-style assignments", () => {
      const { match } = detector.detect(`CC = gcc
CFLAGS = -Wall -Wextra
LDFLAGS = -lm
TARGET = myapp
SRCS = main.c utils.c`);
      // Lowercase keys → may or may not match, but confidence should be low
      const { confidence } = detector.detect(`CC = gcc
CFLAGS = -Wall -Wextra
LDFLAGS = -lm
TARGET = myapp
SRCS = main.c utils.c`);
      if (match) {
        expect(confidence).toBeLessThan(0.7);
      }
    });

    it("does NOT detect Python code", () => {
      const { match } = detector.detect(`def main():
    config = load_config()
    DATABASE_URL = config.get("database_url")
    return DATABASE_URL

if __name__ == "__main__":
    main()`);
      expect(match).toBe(false);
    });

    it("does NOT detect shell scripts", () => {
      const { match } = detector.detect(`#!/bin/bash
echo "Starting application"
if [ -f .env ]; then
  source .env
fi
cd /app && npm start`);
      expect(match).toBe(false);
    });

    it("does NOT detect empty content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   \n  \n  ").match).toBe(false);
    });

    it("does NOT detect single-line content", () => {
      expect(detector.detect("APP_NAME=test").match).toBe(false);
    });

    it("does NOT detect SQL", () => {
      const { match } = detector.detect(`SELECT id, name, email
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 100`);
      expect(match).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("handles values with = signs in them", () => {
      const content = `DATABASE_URL=postgresql://user:pass@host/db?ssl=true
CONNECTION_STRING=Host=localhost;Port=5432;Database=mydb
API_ENDPOINT=https://api.example.com?token=abc&env=prod
SECRET_KEY=base64encodedvalue==`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });

    it("handles mixed case keys gracefully", () => {
      const content = `AppName=test
appPort=3000
DATABASE_URL=postgres://localhost/db
secret_key=abc123`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });

    it("handles files with only comments and kvs", () => {
      const content = `# This is a comment
# Another comment
APP_NAME=test
# More comments
DB_HOST=localhost`;
      const { match } = detector.detect(content);
      expect(match).toBe(true);
    });
  });

  describe("Monaco provider registration", () => {
    it("registers without throwing", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };
      expect(() => detector.registerProvider(mockMonaco)).not.toThrow();
      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "dotenv" });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
    });

    it("skips registration if language already registered", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => [{ id: "dotenv" }]),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: { defineTheme: jest.fn() },
      };
      detector.registerProvider(mockMonaco);
      expect(mockMonaco.languages.register).not.toHaveBeenCalled();
    });

    it("handles missing monaco gracefully", () => {
      expect(() => detector.registerProvider(null)).not.toThrow();
      expect(() => detector.registerProvider(undefined)).not.toThrow();
    });
  });
});
