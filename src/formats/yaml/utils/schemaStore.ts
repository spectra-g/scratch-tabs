/**
 * Schema store for YAML validation and intelligence
 */

export interface YamlSchema {
  id: string;
  name: string;
  description: string;
  fileMatch: string[];
  schema: any; // JSON Schema object
}

// Kubernetes Deployment schema (simplified)
const kubernetesDeploymentSchema = {
  type: 'object',
  properties: {
    apiVersion: {
      type: 'string',
      enum: ['apps/v1', 'apps/v1beta1', 'apps/v1beta2'],
      description: 'API version for the Deployment resource'
    },
    kind: {
      type: 'string',
      enum: ['Deployment'],
      description: 'Resource type'
    },
    metadata: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the deployment' },
        namespace: { type: 'string', description: 'Namespace for the deployment' },
        labels: { type: 'object', description: 'Labels for the deployment' }
      },
      required: ['name']
    },
    spec: {
      type: 'object',
      properties: {
        replicas: { type: 'integer', minimum: 0, description: 'Number of desired pods' },
        selector: {
          type: 'object',
          properties: {
            matchLabels: { type: 'object', description: 'Label selector for pods' }
          },
          required: ['matchLabels']
        },
        template: {
          type: 'object',
          properties: {
            metadata: { type: 'object' },
            spec: {
              type: 'object',
              properties: {
                containers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Container name' },
                      image: { type: 'string', description: 'Container image' },
                      ports: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            containerPort: { type: 'integer', description: 'Port number' }
                          }
                        }
                      }
                    },
                    required: ['name', 'image']
                  }
                }
              },
              required: ['containers']
            }
          },
          required: ['spec']
        }
      },
      required: ['selector', 'template']
    }
  },
  required: ['apiVersion', 'kind', 'metadata', 'spec']
};

// GitHub Actions workflow schema (simplified)
const githubActionsSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Workflow name' },
    on: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
        { type: 'object', description: 'Workflow triggers' }
      ],
      description: 'Events that trigger the workflow'
    },
    jobs: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z_][a-zA-Z0-9_-]*$': {
          type: 'object',
          properties: {
            'runs-on': { 
              type: 'string', 
              enum: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
              description: 'Runner environment'
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Step name' },
                  uses: { type: 'string', description: 'Action to use' },
                  run: { type: 'string', description: 'Command to run' },
                  with: { type: 'object', description: 'Action inputs' },
                  env: { type: 'object', description: 'Environment variables' }
                }
              }
            }
          },
          required: ['runs-on', 'steps']
        }
      },
      description: 'Workflow jobs'
    }
  },
  required: ['on', 'jobs']
};

// Docker Compose schema (simplified)
const dockerComposeSchema = {
  type: 'object',
  properties: {
    version: { 
      type: 'string', 
      enum: ['3.8', '3.7', '3.6', '3.5', '3.4', '3.3', '3.2', '3.1', '3.0'],
      description: 'Compose file format version'
    },
    services: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9._-]+$': {
          type: 'object',
          properties: {
            image: { type: 'string', description: 'Docker image' },
            build: { 
              oneOf: [
                { type: 'string' },
                { type: 'object', properties: { context: { type: 'string' } } }
              ],
              description: 'Build configuration'
            },
            ports: {
              type: 'array',
              items: { type: 'string' },
              description: 'Port mappings'
            },
            environment: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'object' }
              ],
              description: 'Environment variables'
            },
            volumes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Volume mounts'
            },
            depends_on: {
              type: 'array',
              items: { type: 'string' },
              description: 'Service dependencies'
            }
          }
        }
      },
      description: 'Service definitions'
    },
    networks: {
      type: 'object',
      description: 'Network definitions'
    },
    volumes: {
      type: 'object',
      description: 'Volume definitions'
    }
  }
};

// Registry of available schemas
const SCHEMA_REGISTRY: YamlSchema[] = [
  {
    id: 'kubernetes-deployment',
    name: 'Kubernetes Deployment',
    description: 'Kubernetes Deployment resource',
    fileMatch: ['**/k8s/**/*.yaml', '**/kubernetes/**/*.yaml'],
    schema: kubernetesDeploymentSchema,
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions Workflow',
    description: 'GitHub Actions workflow file',
    fileMatch: ['**/.github/workflows/*.yml', '**/.github/workflows/*.yaml'],
    schema: githubActionsSchema,
  },
  {
    id: 'docker-compose',
    name: 'Docker Compose',
    description: 'Docker Compose configuration',
    fileMatch: ['**/docker-compose*.yml', '**/docker-compose*.yaml'],
    schema: dockerComposeSchema,
  },
];

/**
 * Detect the appropriate schema for a YAML document
 */
export function detectYamlSchema(data: any): YamlSchema | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Kubernetes detection
  if (data.apiVersion && data.kind) {
    if (data.kind === 'Deployment') {
      return SCHEMA_REGISTRY.find(s => s.id === 'kubernetes-deployment') || null;
    }
    // Could add more Kubernetes resource types here
  }

  // GitHub Actions detection
  if (data.on && data.jobs) {
    return SCHEMA_REGISTRY.find(s => s.id === 'github-actions') || null;
  }

  // Docker Compose detection
  if (data.version && (data.services || data.networks || data.volumes)) {
    return SCHEMA_REGISTRY.find(s => s.id === 'docker-compose') || null;
  }

  return null;
}

/**
 * Configure Monaco editor with detected schema
 */
export function configureMonacoSchema(
  editor: any,
  schema: YamlSchema
): void {
  try {
    // Configure YAML language service with schema
    const monaco = (window as any).monaco;
    if (monaco && monaco.languages && monaco.languages.yaml) {
      monaco.languages.yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: false,
        hover: true,
        completion: true,
        schemas: [
          {
            uri: `http://internal/${schema.id}.json`,
            fileMatch: ['*'],
            schema: schema.schema,
          },
        ],
      });
    }
  } catch (error) {
    console.warn('Failed to configure YAML schema:', error);
  }
}

/**
 * Get all available schemas
 */
export function getAllSchemas(): YamlSchema[] {
  return [...SCHEMA_REGISTRY];
}

/**
 * Get schema by ID
 */
export function getSchemaById(id: string): YamlSchema | null {
  return SCHEMA_REGISTRY.find(s => s.id === id) || null;
}