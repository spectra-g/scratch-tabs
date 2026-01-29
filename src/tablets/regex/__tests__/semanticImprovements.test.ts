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
    });
});
