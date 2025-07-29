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
  });
});