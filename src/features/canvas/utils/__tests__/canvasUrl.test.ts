import { canonicalizeCanvasUrl } from "../canvasUrl";

describe("Canvas URL canonicalization", () => {
  it.each([
    [
      "  HTTPS://Example.COM:443/docs?q=one#section  ",
      {
        canonicalUrl: "https://example.com/docs?q=one",
        hostname: "example.com",
      },
    ],
    [
      "http://Example.com:80",
      { canonicalUrl: "http://example.com/", hostname: "example.com" },
    ],
  ])("canonicalizes HTTP(S) URL %s", (input, expected) => {
    expect(canonicalizeCanvasUrl(input)).toEqual(expected);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///tmp/private",
    "https://user:password@example.com/",
    "https://exa mple.com/",
    "not a URL",
    "",
  ])("rejects unsafe or invalid URL %s", (input) => {
    expect(canonicalizeCanvasUrl(input)).toBeNull();
  });
});
