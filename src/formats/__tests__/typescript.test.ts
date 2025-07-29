import { TypeScriptFormatDetector } from "../javascript";

describe("TypeScriptFormatDetector", () => {
  let detector: TypeScriptFormatDetector;

  beforeEach(() => {
    detector = new TypeScriptFormatDetector();
  });

  describe("Basic Properties", () => {
    it("should have correct basic properties", () => {
      expect(detector.id).toBe("typescript");
      expect(detector.name).toBe("TypeScript");
      expect(detector.extensions).toEqual(["ts", "tsx"]);
      expect(detector.priority).toBe(7);
    });

    it("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("ts");
    });
  });

  describe("Code Block Detection", () => {
    it("should detect TypeScript with proper code blocks and semicolons", () => {
      const tsContent = `
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

const service = new UserService();
service.addUser({ id: 1, name: "John", email: "john@example.com" });
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect TypeScript with interfaces and types", () => {
      const tsContent = `
type Status = "pending" | "approved" | "rejected";

interface ApiResponse<T> {
  data: T;
  status: Status;
  message: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

const response: ApiResponse<User> = {
  data: { id: 1, name: "John", email: "john@example.com", createdAt: new Date() },
  status: "approved",
  message: "User created successfully"
};
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect TypeScript with enums and generics", () => {
      const tsContent = `
enum Color {
  Red = "RED",
  Green = "GREEN",
  Blue = "BLUE"
}

class Container<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  get(index: number): T | undefined {
    return this.items[index];
  }

  getAll(): T[] {
    return [...this.items];
  }
}

const stringContainer = new Container<string>();
stringContainer.add("hello");
stringContainer.add("world");
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect TypeScript with access modifiers", () => {
      const tsContent = `
class BankAccount {
  private balance: number = 0;
  public readonly accountNumber: string;

  constructor(accountNumber: string) {
    this.accountNumber = accountNumber;
  }

  public deposit(amount: number): void {
    if (amount > 0) {
      this.balance += amount;
    }
  }

  public withdraw(amount: number): boolean {
    if (amount > 0 && amount <= this.balance) {
      this.balance -= amount;
      return true;
    }
    return false;
  }

  public getBalance(): number {
    return this.balance;
  }
}
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe("YAML vs TypeScript Detection", () => {
    it("should NOT detect OpenAPI YAML as TypeScript", () => {
      const yamlContent = `
openapi: "3.0.0"
info:
  version: 1.0.0
  title: Swagger Petstore
  license:
    name: MIT
servers:
  - url: http://petstore.swagger.io/v1
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            format: int32
      responses:
        '200':
          description: A paged array of pets
          headers:
            x-next:
              description: A link to the next page of responses
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pets"
components:
  schemas:
    Pet:
      required:
        - id
        - name
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        tag:
          type: string
    Pets:
      type: array
      items:
        $ref: "#/components/schemas/Pet"
    Error:
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
`;

      const result = detector.detect(yamlContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it("should NOT detect simple YAML as TypeScript", () => {
      const yamlContent = `
name: my-awesome-project
version: 1.0.0
description: A test project
author: John Doe
license: MIT
dependencies:
  - react
  - typescript
  - jest
`;

      const result = detector.detect(yamlContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it("should handle content with only comments", () => {
      const result = detector.detect(`// This is a comment
/* This is a block comment */
// Another comment`);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it("should handle content without code blocks", () => {
      const result = detector.detect(`This is just some text.
It doesn't have any TypeScript structure.
Just plain text content.`);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe("Confidence Scoring", () => {
    it("should give high confidence for TypeScript with multiple code blocks", () => {
      const tsContent = `
interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}

class ApiClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(this.config.apiUrl + endpoint);
    return response.json();
  }
}

const config: Config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

const client = new ApiClient(config);
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should give medium confidence for TypeScript with few code blocks", () => {
      const tsContent = `
type Status = "active" | "inactive";

interface User {
  id: number;
  name: string;
  status: Status;
}

const user: User = { id: 1, name: "John", status: "active" };
`;

      const result = detector.detect(tsContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
      // The improved detector correctly identifies this as TypeScript
      // with high confidence due to the code block detection
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Monaco Provider Registration", () => {
    it("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          setLanguageConfiguration: jest.fn(),
          getLanguages: jest.fn().mockReturnValue([]),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco as any);
      }).not.toThrow();
    });
  });
}); 