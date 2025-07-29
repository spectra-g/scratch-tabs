import { DockerfileFormatDetector } from "../dockerfile";

describe("DockerfileFormatDetector", () => {
  let detector: DockerfileFormatDetector;

  beforeEach(() => {
    detector = new DockerfileFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("dockerfile");
      expect(detector.name).toBe("Dockerfile");
      expect(detector.extensions).toEqual(["dockerfile", "Dockerfile"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("dockerfile");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid Dockerfile sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("FROM");
      expect(sample).toContain("RUN");
      expect(sample).toContain("COPY");
      expect(sample).toContain("WORKDIR");
      expect(sample).toContain("EXPOSE");
      expect(sample).toContain("CMD");
    });
  });

  describe("Detection Logic", () => {
    test("should detect basic Dockerfile", () => {
      const dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
      const result = detector.detect(dockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Dockerfile with base image", () => {
      const dockerfile = `FROM ubuntu:20.04
RUN apt-get update && apt-get install -y python3
WORKDIR /opt/app
COPY requirements.txt .
RUN pip3 install -r requirements.txt`;
      const result = detector.detect(dockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect multi-stage Dockerfile", () => {
      const multiStage = `FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]`;
      const result = detector.detect(multiStage);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect Dockerfile with environment variables", () => {
      const envDockerfile = `FROM python:3.9
ENV PYTHONPATH=/app
ENV DEBUG=False
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`;
      const result = detector.detect(envDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Dockerfile with ARG instructions", () => {
      const argDockerfile = `ARG NODE_VERSION=18
FROM node:$NODE_VERSION
ARG BUILD_ENV=production
ENV NODE_ENV=$BUILD_ENV
WORKDIR /app
COPY . .
RUN npm install`;
      const result = detector.detect(argDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Dockerfile with LABEL instructions", () => {
      const labelDockerfile = `FROM alpine:latest
LABEL maintainer="developer@example.com"
LABEL version="1.0"
LABEL description="This is a sample Docker image"
RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/health`;
      const result = detector.detect(labelDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect Dockerfile with volume mounts", () => {
      const volumeDockerfile = `FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY static/ /usr/share/nginx/html/
VOLUME ["/var/log/nginx"]
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]`;
      const result = detector.detect(volumeDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Dockerfile with ENTRYPOINT", () => {
      const entrypointDockerfile = `FROM openjdk:11-jre
COPY app.jar /app/app.jar
WORKDIR /app
ENTRYPOINT ["java", "-jar"]
CMD ["app.jar"]`;
      const result = detector.detect(entrypointDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect Dockerfile with USER instruction", () => {
      const userDockerfile = `FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --chown=nextjs:nodejs . .
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]`;
      const result = detector.detect(userDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should reject shell scripts", () => {
      const shellScript = `#!/bin/bash
echo "Building application"
npm install
npm run build
echo "Build complete"`;
      const result = detector.detect(shellScript);
      expect(result.match).toBe(false);
    });

    test("should reject YAML content", () => {
      const yamlContent = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production`;
      const result = detector.detect(yamlContent);
      expect(result.match).toBe(false);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "name": "docker-app",
  "version": "1.0.0",
  "scripts": {
    "build": "docker build -t myapp .",
    "run": "docker run -p 3000:3000 myapp"
  }
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("FROM").match).toBe(false);
    });

    test("should handle Dockerfile with comments", () => {
      const commentedDockerfile = `# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]`;
      const result = detector.detect(commentedDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Dockerfile with lowercase instructions", () => {
      const lowercaseDockerfile = `from node:18
workdir /app
copy . .
run npm install
expose 3000
cmd ["npm", "start"]`;
      const result = detector.detect(lowercaseDockerfile);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});