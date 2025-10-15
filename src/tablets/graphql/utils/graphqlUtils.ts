/**
 * GraphQL Utilities
 * Handles introspection, schema parsing, query execution, and WebSocket subscriptions
 */

export interface GraphQLType {
  kind: string;
  name?: string;
  description?: string;
  fields?: GraphQLField[];
  inputFields?: GraphQLInputValue[];
  interfaces?: GraphQLTypeRef[];
  enumValues?: GraphQLEnumValue[];
  possibleTypes?: GraphQLTypeRef[];
  ofType?: GraphQLTypeRef;
}

export interface GraphQLField {
  name: string;
  description?: string;
  args: GraphQLInputValue[];
  type: GraphQLTypeRef;
  isDeprecated: boolean;
  deprecationReason?: string;
}

export interface GraphQLInputValue {
  name: string;
  description?: string;
  type: GraphQLTypeRef;
  defaultValue?: string;
}

export interface GraphQLEnumValue {
  name: string;
  description?: string;
  isDeprecated: boolean;
  deprecationReason?: string;
}

export interface GraphQLTypeRef {
  kind: string;
  name?: string;
  ofType?: GraphQLTypeRef;
}

export interface GraphQLSchema {
  queryType?: { name: string };
  mutationType?: { name: string };
  subscriptionType?: { name: string };
  types: GraphQLType[];
  directives: GraphQLDirective[];
}

export interface GraphQLDirective {
  name: string;
  description?: string;
  locations: string[];
  args: GraphQLInputValue[];
}

export interface IntrospectionResult {
  schema: GraphQLSchema;
  error?: string;
}

/**
 * Standard GraphQL introspection query
 */
export const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Execute introspection query against a GraphQL endpoint
 */
export async function introspectSchema(
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<IntrospectionResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        query: INTROSPECTION_QUERY,
      }),
    });

    if (!response.ok) {
      return {
        schema: { types: [], directives: [] },
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (result.errors) {
      return {
        schema: { types: [], directives: [] },
        error: result.errors[0]?.message || "Introspection failed",
      };
    }

    return {
      schema: result.data.__schema,
    };
  } catch (error) {
    return {
      schema: { types: [], directives: [] },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format a GraphQL type reference as a string
 */
export function formatTypeRef(typeRef: GraphQLTypeRef): string {
  if (typeRef.kind === "NON_NULL") {
    return `${formatTypeRef(typeRef.ofType!)}!`;
  }
  if (typeRef.kind === "LIST") {
    return `[${formatTypeRef(typeRef.ofType!)}]`;
  }
  return typeRef.name || "Unknown";
}

/**
 * Get root types from schema (Query, Mutation, Subscription)
 */
export function getRootTypes(schema: GraphQLSchema): {
  queries: GraphQLField[];
  mutations: GraphQLField[];
  subscriptions: GraphQLField[];
} {
  const queryType = schema.types.find((t) => t.name === schema.queryType?.name);
  const mutationType = schema.types.find(
    (t) => t.name === schema.mutationType?.name
  );
  const subscriptionType = schema.types.find(
    (t) => t.name === schema.subscriptionType?.name
  );

  return {
    queries: queryType?.fields || [],
    mutations: mutationType?.fields || [],
    subscriptions: subscriptionType?.fields || [],
  };
}

/**
 * Find a type by name in the schema
 */
export function findTypeByName(
  schema: GraphQLSchema,
  name: string
): GraphQLType | undefined {
  return schema.types.find((t) => t.name === name);
}

/**
 * Check if a type is a built-in scalar or internal type
 */
export function isBuiltInType(typeName: string): boolean {
  const builtInTypes = [
    "String",
    "Int",
    "Float",
    "Boolean",
    "ID",
    "__Schema",
    "__Type",
    "__TypeKind",
    "__Field",
    "__InputValue",
    "__EnumValue",
    "__Directive",
    "__DirectiveLocation",
  ];
  return builtInTypes.includes(typeName) || typeName.startsWith("__");
}

/**
 * Execute a GraphQL query
 */
export async function executeGraphQLQuery(
  endpoint: string,
  query: string,
  variables: any,
  headers: Record<string, string> = {}
): Promise<{
  data?: any;
  errors?: Array<{ message: string; locations?: any[]; path?: any[] }>;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
}> {
  const startTime = performance.now();

  try {
    // Create timeout signal if available (not available in all environments)
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    };

    // Add timeout if AbortSignal.timeout is available
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      fetchOptions.signal = (AbortSignal as any).timeout(30000);
    }

    const response = await fetch(endpoint, fetchOptions);

    const responseBody = await response.text();
    const responseTime = performance.now() - startTime;
    const size = new Blob([responseBody]).size;

    let parsedBody;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      // If response is not JSON, wrap it in an error
      return {
        errors: [{ message: "Invalid JSON response", path: [] }],
        status: response.status,
        statusText: response.statusText,
        responseTime,
        size,
      };
    }

    return {
      data: parsedBody.data,
      errors: parsedBody.errors,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      size,
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;

    let errorMessage = "Request failed";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Add more context for common errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = `Network error: ${error.message}. This may be a CORS issue or the server is unreachable.`;
      }
    }

    return {
      errors: [{ message: errorMessage, path: [] }],
      status: 0,
      statusText: "Network Error",
      responseTime,
      size: 0,
    };
  }
}

/**
 * WebSocket connection manager for GraphQL subscriptions
 * Uses the graphql-ws protocol (https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md)
 */
export class GraphQLWebSocketClient {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;
  private messageQueue: any[] = [];
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private url: string,
    private connectionParams: Record<string, any> = {}
  ) {}

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, "graphql-transport-ws");

        this.ws.onopen = () => {
          // Send connection_init message
          this.send({
            type: "connection_init",
            payload: this.connectionParams,
          });
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);

          if (message.type === "connection_ack") {
            this.reconnectAttempts = 0;
            resolve();
          } else if (message.type === "connection_error") {
            reject(new Error(message.payload?.message || "Connection failed"));
          } else if (message.type === "next" || message.type === "error") {
            const handler = this.messageHandlers.get(message.id);
            if (handler) {
              handler(message);
            }
          } else if (message.type === "complete") {
            this.messageHandlers.delete(message.id);
          }
        };

        this.ws.onerror = (error) => {
          reject(error);
        };

        this.ws.onclose = () => {
          this.handleClose();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message to the server
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Subscribe to a GraphQL subscription
   */
  subscribe(
    id: string,
    query: string,
    variables: any,
    onMessage: (message: any) => void
  ): void {
    this.messageHandlers.set(id, onMessage);
    this.send({
      id,
      type: "subscribe",
      payload: {
        query,
        variables,
      },
    });
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(id: string): void {
    this.messageHandlers.delete(id);
    this.send({
      id,
      type: "complete",
    });
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Parse variables string to JSON object
 */
export function parseVariables(variablesString: string): any {
  if (!variablesString || variablesString.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(variablesString);
  } catch (error) {
    throw new Error(`Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Detect operation type from query
 */
export function detectOperationType(query: string): "query" | "mutation" | "subscription" | null {
  const trimmed = query.trim();
  if (trimmed.startsWith("query")) return "query";
  if (trimmed.startsWith("mutation")) return "mutation";
  if (trimmed.startsWith("subscription")) return "subscription";
  // Default to query if no explicit operation type
  if (trimmed.startsWith("{")) return "query";
  return null;
}

/**
 * Extract operation names from a query
 */
export function extractOperationNames(query: string): string[] {
  const operationRegex = /(?:query|mutation|subscription)\s+(\w+)/g;
  const matches = [];
  let match;

  while ((match = operationRegex.exec(query)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}
