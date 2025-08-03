import { parseStackTrace, reconstructStackTrace, getStackTraceSummary } from '../parser';

describe('Stack Trace Parser', () => {
  describe('Java Stack Traces', () => {
    const javaTrace = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "str" is null
	at com.example.MyClass.processString(MyClass.java:15)
	at com.example.MyClass.main(MyClass.java:8)
	at java.base/java.lang.reflect.Method.invoke(Method.java:566)
	at java.base/sun.launcher.LauncherHelper.main(LauncherHelper.java:544)
Caused by: java.io.IOException: File not found
	at com.example.FileReader.readFile(FileReader.java:23)
	at com.example.MyClass.processString(MyClass.java:12)
	... 2 more`;

    it('should detect Java language', () => {
      const result = parseStackTrace(javaTrace);
      expect(result.language).toBe('java');
    });

    it('should parse error information', () => {
      const result = parseStackTrace(javaTrace);
      expect(result.errorInfo.errorType).toBe('java.lang.NullPointerException');
      expect(result.errorInfo.errorMessage).toContain('Cannot invoke');
    });

    it('should parse Java frames correctly', () => {
      const result = parseStackTrace(javaTrace);
      expect(result.frames).toHaveLength(4);
      
      const firstFrame = result.frames[0];
      expect(firstFrame.methodName).toBe('com.example.MyClass.processString');
      expect(firstFrame.filePath).toBe('MyClass.java');
      expect(firstFrame.lineNumber).toBe(15);
      expect(firstFrame.isLibraryFrame).toBe(false);
    });

    it('should identify library frames', () => {
      const result = parseStackTrace(javaTrace);
      const libraryFrame = result.frames.find(f => f.methodName?.includes('java.base'));
      expect(libraryFrame?.isLibraryFrame).toBe(true);
    });

    it('should parse "Caused by" sections', () => {
      const result = parseStackTrace(javaTrace);
      expect(result.causedBy).toBeDefined();
      expect(result.causedBy?.errorInfo.errorType).toBe('java.io.IOException');
      expect(result.causedBy?.frames).toHaveLength(3); // Including "... 2 more"
    });
  });

  describe('JavaScript Stack Traces', () => {
    const jsTrace = `TypeError: Cannot read properties of undefined (reading 'length')
    at processItems (/app/src/utils/dataProcessor.js:42:23)
    at async Function.handleRequest (/app/src/controllers/itemController.js:156:12)
    at /app/node_modules/express/lib/router/layer.js:95:5
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)`;

    it('should detect JavaScript language', () => {
      const result = parseStackTrace(jsTrace);
      expect(result.language).toBe('javascript');
    });

    it('should parse JavaScript frames', () => {
      const result = parseStackTrace(jsTrace);
      expect(result.frames).toHaveLength(4);
      
      const firstFrame = result.frames[0];
      expect(firstFrame.methodName).toBe('processItems');
      expect(firstFrame.filePath).toBe('/app/src/utils/dataProcessor.js');
      expect(firstFrame.lineNumber).toBe(42);
      expect(firstFrame.columnNumber).toBe(23);
    });

    it('should identify node_modules as library frames', () => {
      const result = parseStackTrace(jsTrace);
      const libraryFrames = result.frames.filter(f => f.isLibraryFrame);
      expect(libraryFrames).toHaveLength(2);
      expect(libraryFrames[0].filePath).toContain('node_modules');
    });
  });

  describe('Python Stack Traces', () => {
    const pythonTrace = `Traceback (most recent call last):
  File "/app/main.py", line 10, in <module>
    process_data()
  File "/app/utils/processor.py", line 25, in process_data
    result = calculate(data)
  File "/usr/lib/python3.8/site-packages/numpy/core/numeric.py", line 123, in calculate
    return np.array(data)
ValueError: invalid literal for int() with base 10: 'abc'`;

    it('should detect Python language', () => {
      const result = parseStackTrace(pythonTrace);
      expect(result.language).toBe('python');
    });

    it('should parse Python frames', () => {
      const result = parseStackTrace(pythonTrace);
      expect(result.frames).toHaveLength(3);
      
      const firstFrame = result.frames[0];
      expect(firstFrame.filePath).toBe('/app/main.py');
      expect(firstFrame.lineNumber).toBe(10);
      expect(firstFrame.methodName).toBe('<module>');
    });

    it('should identify site-packages as library frames', () => {
      const result = parseStackTrace(pythonTrace);
      const libraryFrame = result.frames.find(f => f.filePath?.includes('site-packages'));
      expect(libraryFrame?.isLibraryFrame).toBe(true);
    });
  });

  describe('Go Stack Traces', () => {
    const goTrace = `panic: runtime error: index out of range [2] with length 2

goroutine 1 [running]:
main.processSlice()
	/app/main.go:15 +0x64
main.main()
	/app/main.go:8 +0x25
runtime.main()
	/usr/local/go/src/runtime/proc.go:250 +0x9d`;

    it('should detect Go language', () => {
      const result = parseStackTrace(goTrace);
      expect(result.language).toBe('go');
    });

    it('should parse Go frames', () => {
      const result = parseStackTrace(goTrace);
      expect(result.frames).toHaveLength(3);
      
      const fileFrame = result.frames.find(f => f.filePath?.includes('main.go'));
      expect(fileFrame?.filePath).toBe('/app/main.go');
      expect(fileFrame?.lineNumber).toBe(15);
    });

    it('should identify runtime frames as library frames', () => {
      const result = parseStackTrace(goTrace);
      const runtimeFrame = result.frames.find(f => f.filePath?.includes('runtime/'));
      expect(runtimeFrame?.isLibraryFrame).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    const sampleTrace = parseStackTrace(`Error: Test error
    at userFunction (/app/src/test.js:10:5)
    at /app/node_modules/lib/index.js:20:10`);

    it('should reconstruct stack trace', () => {
      const reconstructed = reconstructStackTrace(sampleTrace);
      expect(reconstructed).toContain('Error: Test error');
      expect(reconstructed).toContain('userFunction');
      expect(reconstructed).toContain('node_modules');
    });

    it('should filter library frames when reconstructing', () => {
      const reconstructed = reconstructStackTrace(sampleTrace, { includeLibraryFrames: false });
      expect(reconstructed).toContain('userFunction');
      expect(reconstructed).not.toContain('node_modules');
    });

    it('should calculate summary statistics', () => {
      const summary = getStackTraceSummary(sampleTrace);
      expect(summary.totalFrames).toBe(2);
      expect(summary.libraryFrames).toBe(1);
      expect(summary.userFrames).toBe(1);
      expect(summary.languages).toContain('javascript');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = parseStackTrace('');
      expect(result.language).toBe('unknown');
      expect(result.frames).toHaveLength(0);
    });

    it('should handle single line error', () => {
      const result = parseStackTrace('Error: Something went wrong');
      expect(result.errorInfo.errorMessage).toBe('Something went wrong');
      expect(result.frames).toHaveLength(0);
    });

    it('should handle unparseable frames gracefully', () => {
      const result = parseStackTrace(`Error: Test
Some unparseable line
    at validFrame (/test.js:1:1)`);
      
      expect(result.frames).toHaveLength(2);
      expect(result.frames[0].methodName).toBe('Some unparseable line');
      expect(result.frames[1].methodName).toBe('validFrame');
    });
  });
});