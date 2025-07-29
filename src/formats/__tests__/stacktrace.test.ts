import { StacktraceFormatDetector } from "../stacktrace";

describe("StacktraceFormatDetector", () => {
  let detector: StacktraceFormatDetector;

  beforeEach(() => {
    detector = new StacktraceFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("stacktrace");
      expect(detector.name).toBe("Stack Trace");
      expect(detector.extensions).toEqual(["log", "trace", "txt"]);
      expect(detector.priority).toBe(3);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("log");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid stacktrace sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("Exception");
      expect(sample).toContain("at ");
      expect(sample).toContain(".java:");
      expect(sample).toContain("Caused by:");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Java stack trace", () => {
      const javaStackTrace = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "str" is null
	at com.example.Main.processString(Main.java:15)
	at com.example.Main.main(Main.java:8)`;
      const result = detector.detect(javaStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect JavaScript stack trace", () => {
      const jsStackTrace = `TypeError: Cannot read property 'name' of undefined
    at processUser (/app/server.js:42:17)
    at /app/server.js:28:5
    at Array.forEach (<anonymous>)
    at handleRequest (/app/server.js:25:12)
    at IncomingMessage.<anonymous> (/app/server.js:18:3)`;
      const result = detector.detect(jsStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Python stack trace", () => {
      const pythonStackTrace = `Traceback (most recent call last):
  File "/app/main.py", line 15, in <module>
    process_data()
  File "/app/main.py", line 10, in process_data
    result = calculate(None)
  File "/app/main.py", line 5, in calculate
    return value * 2
TypeError: unsupported operand type(s) for *: 'NoneType' and 'int'`;
      const result = detector.detect(pythonStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect C# stack trace", () => {
      const csharpStackTrace = `System.ArgumentNullException: Value cannot be null. (Parameter 'input')
   at MyApp.Processor.ProcessData(String input) in C:\\Projects\\MyApp\\Processor.cs:line 25
   at MyApp.Controller.HandleRequest(HttpContext context) in C:\\Projects\\MyApp\\Controller.cs:line 42
   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.SyncActionResultExecutor.Execute(IActionResultTypeMapper mapper, ObjectMethodExecutor executor, Object controller, Object[] arguments)`;
      const result = detector.detect(csharpStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Go panic stack trace", () => {
      const goStackTrace = `panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV code=0x1 addr=0x0 pc=0x4011b2]

goroutine 1 [running]:
main.processData(0x0, 0x0)
	/app/main.go:15 +0x42
main.main()
	/app/main.go:8 +0x1f`;
      const result = detector.detect(goStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect browser stack trace", () => {
      const browserStackTrace = `ReferenceError: myFunction is not defined
    at HTMLButtonElement.onclick (https://example.com/app.js:25:13)
    at HTMLButtonElement.dispatch (https://code.jquery.com/jquery-3.6.0.min.js:2:42571)
    at HTMLButtonElement.v.handle (https://code.jquery.com/jquery-3.6.0.min.js:2:40572)`;
      const result = detector.detect(browserStackTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect stack trace with caused by", () => {
      const causedByTrace = `java.sql.SQLException: Database connection failed
	at com.example.db.Connection.connect(Connection.java:45)
	at com.example.service.UserService.getUser(UserService.java:23)
	at com.example.controller.UserController.handleRequest(UserController.java:15)
	... 15 more
Caused by: java.net.ConnectException: Connection refused
	at java.base/sun.nio.ch.Net.connect0(Native Method)
	at java.base/sun.nio.ch.Net.connect(Net.java:576)
	... 18 more`;
      const result = detector.detect(causedByTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should reject regular code", () => {
      const codeContent = `function processData() {
    const result = calculate(data);
    return result;
}`;
      const result = detector.detect(codeContent);
      expect(result.match).toBe(false);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "error": "NullPointerException",
  "message": "Value cannot be null",
  "stackTrace": ["at Main.java:15", "at Controller.java:42"]
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should reject plain text logs", () => {
      const plainLog = `2023-01-01 12:00:00 INFO Starting application
2023-01-01 12:00:01 DEBUG Loading configuration
2023-01-01 12:00:02 INFO Application started successfully`;
      const result = detector.detect(plainLog);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("Error").match).toBe(false);
    });

    test("should detect multiline stack trace with nested exceptions", () => {
      const nestedTrace = `org.springframework.web.util.NestedServletException: Request processing failed; nested exception is java.lang.RuntimeException: Service unavailable
	at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:982)
	at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:872)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:650)
	... 47 more
Caused by: java.lang.RuntimeException: Service unavailable
	at com.example.service.ExternalService.call(ExternalService.java:67)
	at com.example.controller.ApiController.handleRequest(ApiController.java:34)
	... 50 more`;
      const result = detector.detect(nestedTrace);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
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