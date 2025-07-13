import { VhostLanguageDetector } from "../vhost";

describe("VhostLanguageDetector", () => {
  let detector: VhostLanguageDetector;

  beforeEach(() => {
    detector = new VhostLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("vhost");
      expect(detector.name).toBe("VHost");
      expect(detector.extensions).toEqual(["vhost", "conf", "config"]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("vhost");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid VHost sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("<VirtualHost");
      expect(sample).toContain("</VirtualHost>");
      expect(sample).toContain("ServerName");
      expect(sample).toContain("DocumentRoot");
      expect(sample).toContain("ErrorLog");
    });
  });

  describe("Detection", () => {
    test("should detect valid VHost with VirtualHost tags", () => {
      const content = `<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html
    ErrorLog /var/log/apache2/error.log
    CustomLog /var/log/apache2/access.log combined
</VirtualHost>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect VHost with SSL configuration", () => {
      const content = `<VirtualHost *:443>
    ServerName secure.example.com
    DocumentRoot /var/www/secure
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/cert.crt
    SSLCertificateKeyFile /etc/ssl/private/key.key
    
    ErrorLog /var/log/apache2/ssl_error.log
</VirtualHost>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect VHost with Directory blocks", () => {
      const content = `<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Apache directives without VirtualHost tags", () => {
      const content = `# Apache configuration
ServerName example.com
DocumentRoot /var/www/html
ErrorLog /var/log/apache2/error.log
CustomLog /var/log/apache2/access.log combined
LoadModule rewrite_module modules/mod_rewrite.so`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should handle comments properly", () => {
      const content = `# This is a VHost configuration
# for example.com
<VirtualHost *:80>
    # Server configuration
    ServerName example.com
    DocumentRoot /var/www/html
    
    # Logging configuration
    ErrorLog /var/log/apache2/error.log
    CustomLog /var/log/apache2/access.log combined
</VirtualHost>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject HTML content", () => {
      const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div class="container">
    <p>This is HTML, not VHost</p>
  </div>
</body>
</html>`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject JavaScript content", () => {
      const content = `function setupVirtualHost() {
  const config = {
    serverName: "example.com",
    documentRoot: "/var/www/html"
  };
  return config;
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject SQL content", () => {
      const content = `SELECT server_name, document_root 
FROM virtual_hosts 
WHERE enabled = 1 
ORDER BY server_name;`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject JSON content", () => {
      const content = `{
  "virtualHost": {
    "serverName": "example.com",
    "documentRoot": "/var/www/html",
    "errorLog": "/var/log/apache2/error.log"
  }
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle very short content", () => {
      const result = detector.detect("test");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should detect minimal VHost configuration", () => {
      const content = `<VirtualHost *:80>
ServerName test.com
</VirtualHost>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerCompletionItemProvider: jest.fn(),
          registerFoldingRangeProvider: jest.fn(),
          CompletionItemKind: {
            Snippet: 1,
            Keyword: 2,
          },
          CompletionItemInsertTextRule: {
            InsertAsSnippet: 1,
          },
          FoldingRangeKind: {
            Region: 1,
          },
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({
        id: "vhost",
      });
      expect(
        mockMonaco.languages.setMonarchTokensProvider,
      ).toHaveBeenCalledWith("vhost", expect.any(Object));
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        "vhost-theme",
        expect.any(Object),
      );
      expect(
        mockMonaco.languages.registerCompletionItemProvider,
      ).toHaveBeenCalledWith("vhost", expect.any(Object));
      expect(
        mockMonaco.languages.registerFoldingRangeProvider,
      ).toHaveBeenCalledWith("vhost", expect.any(Object));
    });
  });
});
