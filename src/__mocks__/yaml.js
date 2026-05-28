// Mock implementation of yaml library for Jest
const createMockDocument = (data = {}, startPos = 0) => ({
  errors: [],
  toJS: () => data,
  range: [startPos, startPos + 100, startPos + 100],
  contents: data && Object.keys(data).length > 0 ? {
    type: 'MAP',
    srcToken: {
      offset: startPos,
      end: startPos + 100,
    },
    range: [startPos, startPos + 100, startPos + 100],
    items: Object.keys(data).map((key, index) => ({
      key: {
        value: key,
        type: 'PLAIN',
        range: [startPos + index * 10, startPos + index * 10 + key.length, startPos + index * 10 + key.length],
        srcToken: { offset: startPos + index * 10, end: startPos + index * 10 + key.length }
      },
      value: {
        value: data[key],
        type: typeof data[key] === 'object' && data[key] !== null ? 'MAP' : 'PLAIN',
        range: [startPos + index * 10 + key.length + 2, startPos + index * 10 + key.length + 10, startPos + index * 10 + key.length + 10],
        srcToken: { offset: startPos + index * 10 + key.length + 2, end: startPos + index * 10 + key.length + 10 },
        items: typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key]) ? 
          Object.keys(data[key]).map((subKey, subIndex) => ({
            key: {
              value: subKey,
              type: 'PLAIN',
              range: [startPos + index * 10 + key.length + 10 + subIndex * 5, startPos + index * 10 + key.length + 10 + subIndex * 5 + subKey.length, startPos + index * 10 + key.length + 10 + subIndex * 5 + subKey.length],
              srcToken: { offset: startPos + index * 10 + key.length + 10 + subIndex * 5, end: startPos + index * 10 + key.length + 10 + subIndex * 5 + subKey.length }
            },
            value: {
              value: data[key][subKey],
              type: 'PLAIN',
              range: [startPos + index * 10 + key.length + 15 + subIndex * 5, startPos + index * 10 + key.length + 20 + subIndex * 5, startPos + index * 10 + key.length + 20 + subIndex * 5],
              srcToken: { offset: startPos + index * 10 + key.length + 15 + subIndex * 5, end: startPos + index * 10 + key.length + 20 + subIndex * 5 }
            }
          })) : undefined
      }
    }))
  } : null
});

const YAML = {
  parseAllDocuments: jest.fn((content) => {
    // Return appropriate mock based on content
    if (content.includes('---')) {
      // Multi-document
      return [
        createMockDocument({ kind: 'ConfigMap' }, 0),
        createMockDocument({ kind: 'Deployment' }, 100)
      ];
    } else if (content.includes('openapi:')) {
      return [createMockDocument({
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.test' }],
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              tags: ['users'],
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' }
          },
          schemas: {
            User: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      })];
    } else if (content.includes('apiVersion')) {
      // Simple Kubernetes-like YAML
      return [createMockDocument({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'my-app' },
        spec: { replicas: 3 }
      })];
    } else if (content.includes('items:')) {
      // Array YAML
      return [createMockDocument({ items: ['item1', 'item2'] })];
    } else if (content.includes('&defaults')) {
      // Anchors YAML
      return [createMockDocument({ defaults: { cpu: '100m' }, app: { cpu: '100m' } })];
    } else if (content.includes('string_value')) {
      // Scalar types YAML
      return [createMockDocument({
        string_value: 'hello',
        number_value: 42,
        boolean_value: true,
        null_value: null
      })];
    } else if (content.includes('invalid')) {
      // Invalid YAML - throw error
      throw new Error('Invalid YAML');
    } else {
      // Default empty
      return [createMockDocument()];
    }
  }),
  parseDocument: jest.fn((content) => {
    if (content.includes('invalid')) {
      const doc = createMockDocument();
      doc.errors = [{ message: 'Invalid YAML' }];
      return doc;
    }
    return createMockDocument();
  }),
};

module.exports = YAML;
