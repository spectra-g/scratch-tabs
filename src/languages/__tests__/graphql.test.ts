import { GraphqlLanguageDetector } from "../graphql";

describe("GraphqlLanguageDetector", () => {
  let detector: GraphqlLanguageDetector;

  beforeEach(() => {
    detector = new GraphqlLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("graphql");
      expect(detector.name).toBe("GraphQL");
      expect(detector.extensions).toEqual(["graphql", "gql", "graphqls"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("graphql");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid GraphQL sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("query");
      expect(sample).toContain("type");
      expect(sample).toContain("{");
      expect(sample).toContain("}");
    });
  });

  describe("Detection Logic", () => {
    test("should detect GraphQL query", () => {
      const gqlQuery = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
      content
    }
  }
}`;
      const result = detector.detect(gqlQuery);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect GraphQL mutation", () => {
      const gqlMutation = `mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}`;
      const result = detector.detect(gqlMutation);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect GraphQL schema", () => {
      const gqlSchema = `type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}`;
      const result = detector.detect(gqlSchema);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `const user = {
  id: 1,
  name: "John",
  email: "john@example.com"
};`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("query").match).toBe(false);
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