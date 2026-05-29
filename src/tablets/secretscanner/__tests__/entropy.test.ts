import { calculateShannonEntropy, decodeBase64Candidate, isHighEntropy } from "../engine/entropy";

describe("secret scanner entropy utilities", () => {
  it("calculates low entropy for repeated values", () => {
    expect(calculateShannonEntropy("aaaaaaaaaaaaaaaa")).toBe(0);
  });

  it("detects generated-looking high entropy values", () => {
    expect(isHighEntropy("uV8k3Pq9Lm2Nx7Za4Bc6Df8Gh0Jk1RsT")).toBe(true);
  });

  it("decodes base64 candidates locally", () => {
    const encoded = btoa("token=super-secret-value");
    expect(decodeBase64Candidate(encoded)).toContain("super-secret-value");
  });
});
