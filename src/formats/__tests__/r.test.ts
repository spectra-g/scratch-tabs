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
      const jsonContent = `{"service.id":"SRVC100118663","destination.port":"10000","sky.provider_territory":null,"url.scheme":"https","service.uuid":"2c2dd7c5-71b6-548b-9d27-b7e5ea839a35","uid":"0f06ab0f-3b60-3894bc8997c5","path":"/opensso/helpforum/idp","sky.top_tenant":"sky-identity","sky.device.platform":null,"url.query":"SAMLRequest=...&RelayState=...&_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%","sky.request_id":"a827a2d7-6b4b-4f6b-8441-26d4e4811e46","http.request.method":"GET","sky.provider":null,"payload":{"httpStatus":200,"elapsedTime":107},"source.ip":"2.216.60.60","logger_name":"skyid.web.filter.LoggingFilter","http.response.status_code":"200","error.code":null,"user_agent.original":"id-gauge/1.0.0 (sky-id-rango-api-tests-java)","http.request.referrer":null,"timeLogged":"2025-08-08T09:15:12.429089Z","method":"GET","level":"INFO","ip_address":"2.216.60.60","message":"request processed","destination.ip":"10.70.107.21","event.duration":107,"country_code":"GB","sky.device.type":null,"@timestamp":"2025-08-08T09:15:12.429105Z","url.path":"/opensso/helpforum/idp","source.port":"39074","service":null,"url.domain":"sky-id-rango-int.dev.ce.eu-central-1-aws.npottdc.sky","http_status":"200","territory":null,"index":"sky_identity_int_app","host":"http-inputs-sky.splunkcloud.com","application":"rango","namespace":"sky-id-rango-signin-int","appname":"rango-signin","service.name":"rango-signin","podname":"rango-signin-968dc7d69-mlhsb","region":"sky-eucentral1-int","service.environment":"sky-eucentral1-int"}`;
      
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