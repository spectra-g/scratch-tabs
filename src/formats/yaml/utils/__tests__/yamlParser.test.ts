import { parseYamlWithPositions, findNodeByPath, findNodePathByLine } from '../yamlParser';

describe('YAML Parser', () => {
  describe('parseYamlWithPositions', () => {
    it('should parse simple YAML structure', () => {
      const yaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
      `.trim();

      const result = parseYamlWithPositions(yaml);
      
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].nodes).toHaveLength(4); // apiVersion, kind, metadata, spec
      
      const metadataNode = result.documents[0].nodes.find(n => n.key === 'metadata');
      expect(metadataNode).toBeDefined();
      expect(metadataNode!.type).toBe('object');
      expect(metadataNode!.children).toHaveLength(2); // name, labels
    });

    it('should handle multi-document YAML', () => {
      const yaml = `
apiVersion: v1
kind: ConfigMap
---
apiVersion: apps/v1
kind: Deployment
      `.trim();

      const result = parseYamlWithPositions(yaml);
      
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].data.kind).toBe('ConfigMap');
      expect(result.documents[1].data.kind).toBe('Deployment');
    });

    it('should parse anchors and aliases', () => {
      const yaml = `
defaults: &defaults
  image: nginx:latest
  ports:
    - 80

web:
  <<: *defaults
  name: web-server

api:
  <<: *defaults
  name: api-server
      `.trim();

      const result = parseYamlWithPositions(yaml);
      
      expect(result.anchors.size).toBe(1);
      expect(result.anchors.has('defaults')).toBe(true);
      
      const defaultsAnchor = result.anchors.get('defaults');
      expect(defaultsAnchor!.usages).toHaveLength(2); // Used in web and api
    });

    it('should handle arrays correctly', () => {
      const yaml = `
items:
  - name: item1
    value: 100
  - name: item2
    value: 200
      `.trim();

      const result = parseYamlWithPositions(yaml);
      
      const itemsNode = result.documents[0].nodes.find(n => n.key === 'items');
      expect(itemsNode).toBeDefined();
      expect(itemsNode!.type).toBe('array');
      expect(itemsNode!.children).toHaveLength(2);
    });

    it('should handle different scalar types', () => {
      const yaml = `
string_value: "hello world"
number_value: 42
boolean_value: true
null_value: null
      `.trim();

      const result = parseYamlWithPositions(yaml);
      
      const nodes = result.documents[0].nodes;
      expect(nodes.find(n => n.key === 'string_value')!.type).toBe('string');
      expect(nodes.find(n => n.key === 'number_value')!.type).toBe('number');
      expect(nodes.find(n => n.key === 'boolean_value')!.type).toBe('boolean');
      expect(nodes.find(n => n.key === 'null_value')!.type).toBe('null');
    });

    it('should handle parse errors gracefully', () => {
      const invalidYaml = `
invalid: yaml: content:
  - missing
    proper: indentation
      `;

      expect(() => parseYamlWithPositions(invalidYaml)).toThrow();
    });

    it('should handle empty content', () => {
      const result = parseYamlWithPositions('');
      
      expect(result.documents).toHaveLength(0);
      expect(result.anchors.size).toBe(0);
    });
  });

  describe('findNodeByPath', () => {
    const sampleNodes = [
      {
        id: '1',
        path: 'metadata',
        key: 'metadata',
        value: {},
        type: 'object' as const,
        line: 1,
        children: [
          {
            id: '2',
            path: 'metadata.name',
            key: 'name',
            value: 'my-app',
            type: 'string' as const,
            line: 2,
          },
        ],
      },
    ];

    it('should find node by exact path', () => {
      const node = findNodeByPath(sampleNodes, 'metadata');
      expect(node).toBeDefined();
      expect(node!.key).toBe('metadata');
    });

    it('should find nested node by path', () => {
      const node = findNodeByPath(sampleNodes, 'metadata.name');
      expect(node).toBeDefined();
      expect(node!.key).toBe('name');
    });

    it('should return null for non-existent path', () => {
      const node = findNodeByPath(sampleNodes, 'nonexistent');
      expect(node).toBeNull();
    });
  });

  describe('findNodePathByLine', () => {
    const sampleNodes = [
      {
        id: '1',
        path: 'metadata',
        key: 'metadata',
        value: {},
        type: 'object' as const,
        line: 1,
        endLine: 3,
        children: [
          {
            id: '2',
            path: 'metadata.name',
            key: 'name',
            value: 'my-app',
            type: 'string' as const,
            line: 2,
          },
        ],
      },
    ];

    it('should find path by line number', () => {
      const path = findNodePathByLine(sampleNodes, 1);
      expect(path).toBe('metadata');
    });

    it('should find nested path by line number', () => {
      const path = findNodePathByLine(sampleNodes, 2);
      expect(path).toBe('metadata.name');
    });

    it('should return null for line not in any node', () => {
      const path = findNodePathByLine(sampleNodes, 100);
      expect(path).toBeNull();
    });
  });
});