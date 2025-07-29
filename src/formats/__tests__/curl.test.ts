import { CurlFormatDetector } from "../curl";

describe("CurlFormatDetector", () => {
  let detector: CurlFormatDetector;

  beforeEach(() => {
    detector = new CurlFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("curl");
      expect(detector.name).toBe("cURL Command");
      expect(detector.extensions).toEqual(["curl", "sh", "bash"]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("sh");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid cURL sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("curl");
      expect(sample).toContain("-H");
      expect(sample).toContain("-d");
      expect(sample).toContain("https://");
    });
  });

  describe("Detection Logic", () => {
    test("should detect simple curl command", () => {
      const curlCommand = `curl https://api.example.com/users`;
      const result = detector.detect(curlCommand);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect curl with headers", () => {
      const curlWithHeaders = `curl -H "Content-Type: application/json" \\
     -H "Authorization: Bearer token123" \\
     https://api.example.com/data`;
      const result = detector.detect(curlWithHeaders);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect curl POST request", () => {
      const curlPost = `curl -X POST \\
  --header "Content-Type: application/json" \\
  --data '{"name": "John", "age": 30}' \\
  https://api.example.com/users`;
      const result = detector.detect(curlPost);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect curl with various options", () => {
      const curlOptions = `curl --location --request GET \\
  --url 'https://api.example.com/search?q=test' \\
  --header 'Accept: application/json' \\
  --header 'User-Agent: MyApp/1.0' \\
  --cookie 'session=abc123' \\
  --output response.json \\
  --verbose`;
      const result = detector.detect(curlOptions);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect curl with file uploads", () => {
      const curlUpload = `curl -X POST \\
  -F "file=@document.pdf" \\
  -F "description=Important document" \\
  https://api.example.com/upload`;
      const result = detector.detect(curlUpload);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect multiple curl commands", () => {
      const multipleCurl = `# Get user info
curl https://api.example.com/user/123

# Update user
curl -X PUT \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Updated Name"}' \\
  https://api.example.com/user/123

# Delete user
curl -X DELETE https://api.example.com/user/123`;
      const result = detector.detect(multipleCurl);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should reject regular shell scripts", () => {
      const shellScript = `#!/bin/bash
echo "Starting process"
cd /home/user
ls -la
mkdir new_directory`;
      const result = detector.detect(shellScript);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data));`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject Python code", () => {
      const pythonCode = `import requests

response = requests.get('https://api.example.com/data')
print(response.json())`;
      const result = detector.detect(pythonCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("curl").match).toBe(false);
    });

    test("should detect curl with authentication", () => {
      const curlAuth = `curl -u username:password \\
  --basic \\
  https://api.example.com/secure

curl --oauth2-bearer "token123" \\
  https://api.example.com/oauth`;
      const result = detector.detect(curlAuth);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
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
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});