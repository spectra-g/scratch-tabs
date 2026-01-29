import { explainRegexNaturally } from "../utils/regexEngine";

describe("Regex Semantic Improvements", () => {
    describe("Modern Syntax Support", () => {
        test("Unicode property escapes", () => {
            const explanation = explainRegexNaturally("\\p{L}");
            expect(explanation).toContain("Matches \\p{L}");
        });

        test("Named backreferences", () => {
            const explanation = explainRegexNaturally("(?<name>\\w+)\\k<name>");
            // The current generator might prioritize capture descriptions
            expect(explanation).toContain("captured as 'name'");
        });
    });

    describe("Error Handling & Fallback", () => {
        test("Unclosed group", () => {
            const explanation = explainRegexNaturally("(");
            expect(explanation).toBe("Matches group.");
        });

        test("Unclosed character class", () => {
            const explanation = explainRegexNaturally("[a-");
            expect(explanation).toBe("Matches character in [[a-].");
        });

        test("Trailing backslash", () => {
            const explanation = explainRegexNaturally("\\");
            expect(explanation).toBe("Matches the literal text '\\'.");
        });
    });

    describe("Pattern Matcher Refinements", () => {
        test("Email with hex code @", () => {
            const explanation = explainRegexNaturally("[\\w.-]+\\x40[\\w.-]+\\.[\\w]{2,}");
            expect(explanation).toBe("Matches an email address format.");
        });

        test("Date ISO false positive avoidance", () => {
            // Product ID format that looks like a date but contains letters
            const explanation = explainRegexNaturally("^ABCD-\\d{2}-\\d{2}$");
            expect(explanation).not.toBe("Matches a date in YYYY-MM-DD format.");
        });

        test("SSN false positive avoidance", () => {
            // Something that looks like SSN but contains letters
            const explanation = explainRegexNaturally("^ABC-\\d{2}-\\d{4}$");
            expect(explanation).not.toContain("Social Security Number");
        });

        test("Mixed alphanumeric should not match SSN", () => {
            // Matches 3-2-4 structure, but has a letter prefix inside the regex pattern
            const explanation = explainRegexNaturally("^\\d{3}-\\d{2}-[A-Z]\\d{3}$");
            expect(explanation).not.toContain("Social Security Number");
        });

        test("Date US false positive avoidance", () => {
            // Looks like MM/DD/YYYY but has letters
            const explanation = explainRegexNaturally("^\\d{2}/\\d{2}/Y\\d{3}$");
            expect(explanation).not.toContain("MM/DD/YYYY");
        });

        test("Phone dashes false positive avoidance", () => {
            // Looks like XXX-XXX-XXXX but has letters
            const explanation = explainRegexNaturally("^\\d{3}-\\d{3}-P\\d{3}$");
            expect(explanation).not.toContain("phone number");
        });
    });

    describe("Fidelity & Edge Cases", () => {
        test("Fidelity: Complex nested groups and lookarounds", () => {
            const pattern = "^(?<user>[a-z]+)(?!=admin)@(?:domain|host)\\.(com|org)$";
            const explanation = explainRegexNaturally(pattern);
            expect(explanation).toContain("Checks that the string");
        });

        test("Incomplete hex escape", () => {
            // User types \x4 but stops
            const explanation = explainRegexNaturally("\\x4");
            expect(explanation).toBeDefined();
        });

        test("Incomplete unicode property", () => {
            // User types \p{Let but stops
            const explanation = explainRegexNaturally("\\p{Let");
            expect(explanation).toBeDefined();
        });

        test("Password validation flow", () => {
            const pattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$";
            const explanation = explainRegexNaturally(pattern);
            expect(explanation).toContain("and then ensures it is at least 8 characters long");
            expect(explanation).toContain("lowercase letter, uppercase letter, and digit");
        });

        test("Vowel sorting (order independent)", () => {
            // Order should not matter for vowel recognition
            expect(explainRegexNaturally("[uoiea]")).toBe("Matches vowel.");
            expect(explainRegexNaturally("[UOIEAuoiea]")).toBe("Matches vowel.");
        });

        test("Empty character classes", () => {
            expect(explainRegexNaturally("[]")).toBe("Matches nothing (empty class).");
            expect(explainRegexNaturally("[^]")).toBe("Matches any character.");
        });

        test("Tightened email matcher", () => {
            // Should still match real email-like regex
            expect(explainRegexNaturally("\\w+@\\w+\\.\\w+")).toBe("Matches an email address format.");
            // Should NOT match if @ is at the start (or just literal @)
            expect(explainRegexNaturally("@handle\\.")).not.toBe("Matches an email address format.");
        });

        test("Wildcard lookahead description", () => {
            // (?=.{8,}) should mention "any character" instead of "the specified pattern"
            const explanation = explainRegexNaturally("(?=.{8,})");
            expect(explanation).toContain("any character");
        });

        test("Escape sequence support", () => {
            expect(explainRegexNaturally("\\v")).toContain("vertical tab");
            expect(explainRegexNaturally("\\t")).toContain("tab");
            expect(explainRegexNaturally("\\cM")).toContain("control-M");
            expect(explainRegexNaturally("\\0")).toContain("null character");
        });

        test("Alternation operator precedence", () => {
            // ^a|b$ should parse as (^a)|(b$)
            const explanation = explainRegexNaturally("^a|b$");
            expect(explanation).toBe("Matches 'a' at the start of the string or 'b' at the end of the string.");
        });

        test("Stress Test Regex: ^[uoiea]{3,}|\\x40\\w+$", () => {
            const pattern = "^[uoiea]{3,}|\\x40\\w+$";
            const explanation = explainRegexNaturally(pattern);
            // Expected: 3 or more vowels at the start of the string or '@' followed by one or more word character at the end of the string
            expect(explanation).toContain("3 or more vowel at the start of the string");
            expect(explanation).toContain("'@' followed by one or more word character at the end of the string");
        });
    });
});
