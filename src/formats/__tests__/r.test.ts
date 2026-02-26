import { RFormatDetector } from "../r";

describe("RFormatDetector", () => {
  let detector: RFormatDetector;

  beforeEach(() => {
    detector = new RFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("r");
      expect(detector.name).toBe("R");
      expect(detector.extensions).toEqual(["r", "R"]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("r");
    });
  });

  describe("Detection Logic", () => {
    test("should detect R code", () => {
      const rCode = `library(ggplot2)
data <- data.frame(x = 1:10, y = rnorm(10))
plot(data$x, data$y)
summary(data)`;
      const result = detector.detect(rCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect R function", () => {
      const rFunction = `my_function <- function(x, y) {
  return(x + y)
}

result <- my_function(5, 3)
print(result)`;
      const result = detector.detect(rFunction);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should handle empty content", () => {
      expect(detector.detect("").match).toBe(false);
    });

    test("should detect R code with $ operator", () => {
      const rCodeWithDollar = `data <- data.frame(x = 1:10, y = rnorm(10))
result <- data$x + data$y.values
summary(result)`;
      const result = detector.detect(rCodeWithDollar);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should NOT detect JSON with dot notation properties as R", () => {
      const jsonContent = `{"event.id":"evt-000001","service.id":"svc-0001","service.name":"sample-service","request.id":"req-0001","request.path":"/api/v1/resource","request.method":"GET","url.scheme":"https","url.domain":"api.example.test","url.query":"mode=test&source=sample","client.ip":"192.0.2.10","server.ip":"198.51.100.20","response.status_code":"200","response.time_ms":42,"environment.name":"test-env","region.name":"region-a","tenant.name":"tenant-sample","host.name":"ingest.example.test","log.level":"INFO","message":"sample request processed","@timestamp":"2026-01-01T00:00:00.000Z","payload":{"result":"ok","count":1}}`;
      
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should NOT detect simple JSON objects as R", () => {
      const simpleJson = `{"user.name": "John Doe", "user.email": "john@example.com", "user.id": 123}`;
      
      const result = detector.detect(simpleJson);
      expect(result.match).toBe(false);
    });

    test("should still detect legitimate R patterns outside of quotes", () => {
      const mixedContent = `# This has both JSON and R
json_data <- '{"user.name": "John", "user.id": 123}'
user_data$name <- "John"
result <- data.frame$values`;
      
      const result = detector.detect(mixedContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });
});
