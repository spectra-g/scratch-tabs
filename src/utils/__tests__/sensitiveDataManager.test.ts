import { SensitiveDataManager } from "../sensitiveDataManager";

describe("SensitiveDataManager", () => {
  describe("mask", () => {
    it("should mask plain text data with prefix", () => {
      const plainText = "mySecretPassword123";
      const masked = SensitiveDataManager.mask(plainText);

      expect(masked).toMatch(/^sb64:/);
      expect(masked).not.toBe(plainText);
      expect(masked.length).toBeGreaterThan(plainText.length);
    });

    it("should not mask already masked data", () => {
      const plainText = "mySecretPassword123";
      const masked = SensitiveDataManager.mask(plainText);
      const maskedAgain = SensitiveDataManager.mask(masked);

      expect(masked).toBe(maskedAgain);
    });

    it("should handle empty strings", () => {
      const result = SensitiveDataManager.mask("");
      expect(result).toBe("");
    });
  });

  describe("unmask", () => {
    it("should unmask masked data correctly", () => {
      const plainText = "mySecretPassword123";
      const masked = SensitiveDataManager.mask(plainText);
      const unmasked = SensitiveDataManager.unmask(masked);

      expect(unmasked).toBe(plainText);
    });

    it("should return plain text if not masked", () => {
      const plainText = "notMaskedText";
      const result = SensitiveDataManager.unmask(plainText);

      expect(result).toBe(plainText);
    });

    it("should handle empty strings", () => {
      const result = SensitiveDataManager.unmask("");
      expect(result).toBe("");
    });
  });

  describe("isMasked", () => {
    it("should detect masked data", () => {
      const plainText = "mySecretPassword123";
      const masked = SensitiveDataManager.mask(plainText);

      expect(SensitiveDataManager.isMasked(masked)).toBe(true);
      expect(SensitiveDataManager.isMasked(plainText)).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(SensitiveDataManager.isMasked("")).toBe(false);
    });
  });

  describe("migrateField", () => {
    it("should mask unmasked data", () => {
      const plainText = "mySecretKey";
      const result = SensitiveDataManager.migrateField(plainText);

      expect(SensitiveDataManager.isMasked(result)).toBe(true);
      expect(SensitiveDataManager.unmask(result)).toBe(plainText);
    });

    it("should leave masked data unchanged", () => {
      const plainText = "mySecretKey";
      const masked = SensitiveDataManager.mask(plainText);
      const result = SensitiveDataManager.migrateField(masked);

      expect(result).toBe(masked);
    });
  });

  describe("migrateObjectArray", () => {
    it("should migrate specified fields in object array", () => {
      const data = [
        { id: "1", password: "secret123", username: "user1" },
        { id: "2", password: "secret456", username: "user2" },
      ];

      const migrated = SensitiveDataManager.migrateObjectArray(data, [
        "password",
      ]);

      expect(migrated).toHaveLength(2);
      expect(SensitiveDataManager.isMasked(migrated[0].password)).toBe(true);
      expect(SensitiveDataManager.isMasked(migrated[1].password)).toBe(true);
      expect(migrated[0].username).toBe("user1"); // Username should be unchanged
      expect(migrated[1].username).toBe("user2"); // Username should be unchanged
    });

    it("should handle empty arrays", () => {
      const result = SensitiveDataManager.migrateObjectArray([], ["password"]);
      expect(result).toEqual([]);
    });
  });

  describe("round-trip masking", () => {
    it("should preserve data through mask/unmask cycle", () => {
      const testData = [
        "simple password",
        "complex!@#$%^&*()password",
        "unicode🔐password",
        "very-long-password-with-multiple-special-characters-and-numbers-123456789",
        "Base64LikeString+/=",
        "jwt.token.signature",
      ];

      testData.forEach((original) => {
        const masked = SensitiveDataManager.mask(original);
        const unmasked = SensitiveDataManager.unmask(masked);

        expect(unmasked).toBe(original);
        expect(SensitiveDataManager.isMasked(masked)).toBe(true);
        expect(SensitiveDataManager.isMasked(original)).toBe(false);
      });
    });
  });
});
