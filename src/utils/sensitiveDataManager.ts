export class SensitiveDataManager {
  private static readonly PREFIX = "sb64:"; // "scratch-base64"

  /**
   * Mask sensitive data using base64 encoding with prefix
   */
  static mask(data: string): string {
    if (!data) return data;
    if (this.isMasked(data)) return data; // Already masked

    try {
      // Handle unicode characters by first encoding as UTF-8
      const utf8Encoded = encodeURIComponent(data);
      return this.PREFIX + btoa(utf8Encoded);
    } catch (error) {
      console.warn("Failed to mask data:", error);
      return data; // Return original if masking fails
    }
  }

  /**
   * Unmask sensitive data by removing prefix and base64 decoding
   */
  static unmask(data: string): string {
    if (!data) return data;
    if (!this.isMasked(data)) return data; // Plain text

    try {
      const base64Data = atob(data.substring(this.PREFIX.length));
      // Decode the UTF-8 encoded string
      return decodeURIComponent(base64Data);
    } catch (error) {
      console.warn("Failed to unmask data:", error);
      return data; // Return original if unmasking fails
    }
  }

  /**
   * Check if data is already masked
   */
  static isMasked(data: string): boolean {
    return Boolean(data && data.startsWith(this.PREFIX));
  }

  /**
   * Migrate a field from plain text to masked format if needed
   */
  static migrateField(data: string): string {
    if (!data || this.isMasked(data)) return data;
    return this.mask(data);
  }

  /**
   * Migrate an array of objects, masking specified fields
   */
  static migrateObjectArray<T extends Record<string, any>>(
    array: T[],
    fieldsToMask: (keyof T)[],
  ): T[] {
    if (!Array.isArray(array)) return array;

    return array.map((item) => {
      const migratedItem = { ...item };
      fieldsToMask.forEach((field) => {
        if (typeof migratedItem[field] === "string") {
          (migratedItem[field] as any) = this.migrateField(
            migratedItem[field] as string,
          );
        }
      });
      return migratedItem;
    });
  }
}
