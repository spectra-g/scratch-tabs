import { SqlFormatDetector } from "../sql";

describe("SqlFormatDetector", () => {
  let detector: SqlFormatDetector;

  beforeEach(() => {
    detector = new SqlFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("sql");
      expect(detector.name).toBe("SQL");
      expect(detector.extensions).toEqual(["sql", "ddl", "dml"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("sql");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid SQL sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("SELECT");
      expect(sample).toContain("FROM");
      expect(sample).toContain("WHERE");
      expect(sample).toContain("CREATE TABLE");
    });
  });

  describe("Detection Logic", () => {
    test("should detect SELECT statements", () => {
      const sqlCode = `SELECT id, name, email, created_at
FROM users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 10;`;
      const result = detector.detect(sqlCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect CREATE TABLE statements", () => {
      const createTable = `CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;
      const result = detector.detect(createTable);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect complex JOIN queries", () => {
      const joinQuery = `SELECT u.name, p.title, c.name as category
FROM users u
INNER JOIN posts p ON u.id = p.user_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE u.active = 1
  AND p.published = 1
  AND p.created_at >= '2023-01-01'
ORDER BY p.created_at DESC;`;
      const result = detector.detect(joinQuery);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect INSERT statements", () => {
      const insertSql = `INSERT INTO users (name, email, password_hash)
VALUES 
    ('John Doe', 'john@example.com', 'hash123'),
    ('Jane Smith', 'jane@example.com', 'hash456'),
    ('Bob Johnson', 'bob@example.com', 'hash789');`;
      const result = detector.detect(insertSql);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect UPDATE statements", () => {
      const updateSql = `UPDATE users 
SET 
    name = 'John Updated',
    email = 'john.updated@example.com',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;`;
      const result = detector.detect(updateSql);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect DELETE statements", () => {
      const deleteSql = `DELETE FROM posts 
WHERE user_id IN (
    SELECT id FROM users WHERE active = 0
) AND created_at < '2022-01-01';`;
      const result = detector.detect(deleteSql);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect stored procedures", () => {
      const procedure = `CREATE PROCEDURE GetUserPosts(IN user_id INT)
BEGIN
    SELECT p.id, p.title, p.content, p.created_at
    FROM posts p
    WHERE p.user_id = user_id
      AND p.published = 1
    ORDER BY p.created_at DESC;
END;`;
      const result = detector.detect(procedure);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect window functions", () => {
      const windowSql = `SELECT 
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank,
    SUM(salary) OVER (PARTITION BY department) as total_dept_salary,
    LAG(salary) OVER (ORDER BY hire_date) as prev_salary
FROM employees;`;
      const result = detector.detect(windowSql);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `const users = await db.select('*').from('users').where('active', 1);
console.log(users);`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "query": "SELECT * FROM users",
  "params": {"active": 1},
  "limit": 10
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("SELECT").match).toBe(false);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});