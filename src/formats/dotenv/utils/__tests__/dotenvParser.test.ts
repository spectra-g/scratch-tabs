import { parseDotenv, getValueStats } from "../dotenvParser";

describe("parseDotenv", () => {
  describe("basic parsing", () => {
    it("parses a simple key=value pair", () => {
      const { entries } = parseDotenv("APP_NAME=MyApp\nAPP_PORT=3000");
      expect(entries).toHaveLength(2);
      expect(entries[0].key).toBe("APP_NAME");
      expect(entries[0].value).toBe("MyApp");
      expect(entries[1].key).toBe("APP_PORT");
      expect(entries[1].value).toBe("3000");
    });

    it("strips double-quoted values", () => {
      const { entries } = parseDotenv('APP_NAME="My Application"\nDB=test');
      expect(entries[0].value).toBe("My Application");
      expect(entries[0].rawValue).toBe('"My Application"');
    });

    it("strips single-quoted values", () => {
      const { entries } = parseDotenv("APP_NAME='My Application'\nDB=test");
      expect(entries[0].value).toBe("My Application");
    });

    it("preserves empty values", () => {
      const { entries } = parseDotenv("EMPTY=\nFULL=value");
      expect(entries[0].key).toBe("EMPTY");
      expect(entries[0].value).toBe("");
    });

    it("handles export prefix", () => {
      const { entries } = parseDotenv("export API_KEY=abc123\nexport SECRET=xyz");
      expect(entries[0].key).toBe("API_KEY");
      expect(entries[0].value).toBe("abc123");
      expect(entries[0].hasExport).toBe(true);
    });

    it("handles values with = signs", () => {
      const { entries } = parseDotenv("DATABASE_URL=postgres://host/db?ssl=true\nKEY=base64==");
      expect(entries[0].value).toBe("postgres://host/db?ssl=true");
      expect(entries[1].value).toBe("base64==");
    });

    it("records correct line numbers", () => {
      const content = "# comment\nAPP_NAME=test\n\nDB_HOST=localhost";
      const { entries } = parseDotenv(content);
      expect(entries[0].lineNumber).toBe(2);
      expect(entries[1].lineNumber).toBe(4);
    });
  });

  describe("comment handling", () => {
    it("collects full-line comments", () => {
      const { comments } = parseDotenv(`# Database config
DB_HOST=localhost
# Another comment
DB_PORT=5432`);
      expect(comments).toHaveLength(2);
      expect(comments[0]).toBe("Database config");
      expect(comments[1]).toBe("Another comment");
    });

    it("skips inline comments for unquoted values", () => {
      const { entries } = parseDotenv("PORT=3000 # the port\nHOST=localhost");
      expect(entries[0].value.trim()).toBe("3000");
      expect(entries[0].comment).toBe("the port");
    });
  });

  describe("type inference", () => {
    it("infers 'url' for HTTP/HTTPS values", () => {
      const { entries } = parseDotenv("API_URL=https://api.example.com\nDB=test");
      expect(entries[0].type).toBe("url");
    });

    it("infers 'boolean' for true/false/yes/no", () => {
      const { entries } = parseDotenv(`DEBUG=true
VERBOSE=false
ENABLED=yes
DISABLED=no
FEATURE=on
FEATURE2=off`);
      for (const e of entries) {
        expect(e.type).toBe("boolean");
      }
    });

    it("infers 'number' for numeric values", () => {
      const { entries } = parseDotenv("PORT=3000\nTIMEOUT=30.5\nCOUNT=test");
      expect(entries[0].type).toBe("number");
      expect(entries[1].type).toBe("number");
      expect(entries[2].type).toBe("string");
    });

    it("infers 'json' for JSON values", () => {
      const { entries } = parseDotenv('CONFIG={"key":"value"}\nLIST=[1,2,3]');
      expect(entries[0].type).toBe("json");
      expect(entries[1].type).toBe("json");
    });

    it("marks secret keys as isSecret", () => {
      const { entries } = parseDotenv(`API_KEY=abc
SECRET=xyz
PASSWORD=pass
JWT_TOKEN=tok
DATABASE_URL=url
NORMAL_VALUE=notSecret`);
      expect(entries[0].isSecret).toBe(true);   // API_KEY
      expect(entries[1].isSecret).toBe(true);   // SECRET
      expect(entries[2].isSecret).toBe(true);   // PASSWORD
      expect(entries[3].isSecret).toBe(true);   // JWT_TOKEN
      expect(entries[5].isSecret).toBe(false);  // NORMAL_VALUE
    });
  });

  describe("blank lines", () => {
    it("records blank line positions", () => {
      const content = "KEY1=val\n\nKEY2=val\n\n\nKEY3=val";
      const { blankLineGroups } = parseDotenv(content);
      expect(blankLineGroups).toContain(2);
      expect(blankLineGroups).toContain(4);
      expect(blankLineGroups).toContain(5);
    });
  });
});

describe("getValueStats", () => {
  it("counts variables correctly", () => {
    const { entries } = parseDotenv(`API_KEY=secret123
DATABASE_URL=https://db.example.com
DEBUG=true
PORT=3000
EMPTY=
NORMAL=value`);
    const stats = getValueStats(entries);
    expect(stats.total).toBe(6);
    expect(stats.urls).toBe(1);
    expect(stats.booleans).toBe(1);
    expect(stats.empty).toBe(1);
    expect(stats.secrets).toBeGreaterThanOrEqual(1);
  });

  it("handles empty entries array", () => {
    const stats = getValueStats([]);
    expect(stats.total).toBe(0);
    expect(stats.secrets).toBe(0);
    expect(stats.urls).toBe(0);
    expect(stats.booleans).toBe(0);
    expect(stats.empty).toBe(0);
  });
});
