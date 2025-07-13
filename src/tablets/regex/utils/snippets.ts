import { RegexSnippet } from "../types";

export const REGEX_SNIPPETS: RegexSnippet[] = [
  // Email
  {
    id: "email-basic",
    name: "Email (Basic)",
    pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
    description: "Basic email validation pattern",
    category: "Email",
  },
  {
    id: "email-strict",
    name: "Email (Strict)",
    pattern:
      "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
    description: "RFC 5322 compliant email validation",
    category: "Email",
  },

  // URLs
  {
    id: "url-http",
    name: "HTTP/HTTPS URL",
    pattern:
      "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
    description: "Matches HTTP and HTTPS URLs",
    category: "URL",
  },

  // Dates
  {
    id: "date-iso",
    name: "ISO Date (YYYY-MM-DD)",
    pattern:
      "(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])",
    description: "ISO 8601 date format with named groups",
    category: "Date",
  },

  // Phone Numbers
  {
    id: "phone-us",
    name: "US Phone Number",
    pattern:
      "\\(?(?<area>\\d{3})\\)?[-.\\s]?(?<exchange>\\d{3})[-.\\s]?(?<number>\\d{4})",
    description: "US phone number with various formats",
    category: "Phone",
  },

  // Text Patterns
  {
    id: "word-boundary",
    name: "Whole Words",
    pattern: "\\b(?<word>\\w+)\\b",
    description: "Match whole words only",
    category: "Text",
  },

  // Numbers
  {
    id: "integer",
    name: "Integer",
    pattern: "-?\\d+",
    description: "Positive or negative integers",
    category: "Numbers",
  },
  {
    id: "decimal",
    name: "Decimal Number",
    pattern: "-?\\d+(?:\\.\\d+)?",
    description: "Decimal numbers with optional minus sign",
    category: "Numbers",
  },

  // Code Patterns
  {
    id: "hex-color",
    name: "Hex Color",
    pattern: "#(?<color>[0-9a-fA-F]{3}|[0-9a-fA-F]{6})",
    description: "Hexadecimal color codes",
    category: "Code",
  },
  {
    id: "ip-address",
    name: "IP Address",
    pattern:
      "(?<ip>(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3})",
    description: "IPv4 address validation",
    category: "Code",
  },
];

export function getSnippetsByCategory(): Record<string, RegexSnippet[]> {
  const grouped: Record<string, RegexSnippet[]> = {};

  REGEX_SNIPPETS.forEach((snippet) => {
    if (!grouped[snippet.category]) {
      grouped[snippet.category] = [];
    }
    grouped[snippet.category].push(snippet);
  });

  return grouped;
}

export function getSnippetById(id: string): RegexSnippet | undefined {
  return REGEX_SNIPPETS.find((snippet) => snippet.id === id);
}
