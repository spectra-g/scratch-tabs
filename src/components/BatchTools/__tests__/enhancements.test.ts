
import { describe, it, expect } from "@jest/globals";
import { applyTransformations } from "../transformations";

describe("Enhanced Transformations", () => {
    it("should support SCREAMING_SNAKE_CASE", () => {
        const input = "Enable dark mode\nShow user profile";
        const config = { caseTransform: "screaming-snake" as const };
        const result = applyTransformations(input, config);
        expect(result).toBe("ENABLE_DARK_MODE\nSHOW_USER_PROFILE");
    });

    it("should support $value interpolation in prefix", () => {
        const input = "apple\nbanana";
        const config = { addPrefix: "fruit: $value - " };
        const result = applyTransformations(input, config);
        expect(result).toBe("fruit: apple - apple\nfruit: banana - banana");
    });

    it("should support $value interpolation in suffix", () => {
        const input = "key\nvalue";
        const config = { addSuffix: " = $value;" };
        const result = applyTransformations(input, config);
        expect(result).toBe("key = key;\nvalue = value;");
    });

    it("should combine SCREAMING_SNAKE_CASE with prefix/suffix interpolation (User Scenario)", () => {
        const input = "Enable dark mode\nShow user profile";
        // User wants: export const FEATURE_ENABLE_DARK_MODE = "enable_dark_mode";
        // Step 1: Snake Case (handled by user selection order or assumes input is somehow ready?)
        // Wait, the user said they want to convert "Enable dark mode" to that.
        // If they strictly select "SCREAMING_SNAKE_CASE", they get "ENABLE_DARK_MODE".
        // $value in prefix/suffix refers to the CURRENT state of the line at that step.
        // Logic order in transformations.ts:
        // ...
        // 2. Case Conversion
        // ...
        // 6. Prefix/Suffix

        // So if Case Transform runs first, $value in Prefix/Suffix will receive the Uppercased value.
        // This means `export const FEATURE_ENABLE_DARK_MODE = "ENABLE_DARK_MODE";`

        const config = {
            caseTransform: "screaming-snake" as const,
            addPrefix: "export const FEATURE_",
            addSuffix: ' = "$value";'
        };

        const result = applyTransformations(input, config);

        // Correct behavior: $value in suffix should refer to the line *before* prefix is added.
        // So:
        // Value: ENABLE_DARK_MODE
        // Expectation:
        // 1. Prefix: "export const FEATURE_"
        // 2. Transform: "ENABLE_DARK_MODE"
        // 3. Suffix: ' = "Enable dark mode";' (Uses ORIGINAL value)
        // Result: 'export const FEATURE_ENABLE_DARK_MODE = "Enable dark mode";'
        expect(result).toBe('export const FEATURE_ENABLE_DARK_MODE = "Enable dark mode";\nexport const FEATURE_SHOW_USER_PROFILE = "Show user profile";');
    });

    it("should handle mixed case input for screaming snake case", () => {
        const input = "already_snake\ncamelCase\nTitle Case";
        const config = { caseTransform: "screaming-snake" as const };
        const result = applyTransformations(input, config);
        expect(result).toBe("ALREADY_SNAKE\nCAMEL_CASE\nTITLE_CASE");
    });
});
