export interface CompactEmoji {
  c: string; // char
  n: string; // name
  s: string; // shortcode (without colons)
  k: string[]; // keywords
  t: boolean; // supportsTones
  cat: string; // category
}

export interface EmojiFormatOption {
  key: "char" | "shortcode" | "html" | "css" | "js" | "datauri";
  label: string;
  description: string;
}

export interface SkinTone {
  name: string;
  modifier: string;
}

export interface UnicodeInfo {
  codepoint: string;
  utf8: string;
  jsEscape: string;
}