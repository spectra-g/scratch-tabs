export interface CompactEmoji {
  c: string; // char
  n: string; // name
  s: string; // shortcode (without colons)
  k: string[]; // keywords
  t: boolean; // supportsTones
  cat: string; // category
}

export const emojiData: CompactEmoji[] = [
  // Smileys & Emotion
  {
    c: "😀",
    n: "grinning face",
    s: "grinning",
    k: ["happy", "smile", "face", "joy"],
    t: false,
    cat: "Smileys & Emotion"
  },
  {
    c: "😊",
    n: "smiling face with smiling eyes",
    s: "blush",
    k: ["happy", "smile", "face", "blush"],
    t: false,
    cat: "Smileys & Emotion"
  },
  {
    c: "😎",
    n: "smiling face with sunglasses",
    s: "sunglasses",
    k: ["cool", "smile", "face", "sunglasses"],
    t: false,
    cat: "Smileys & Emotion"
  },
  {
    c: "🤔",
    n: "thinking face",
    s: "thinking",
    k: ["think", "face", "hmm", "consider"],
    t: false,
    cat: "Smileys & Emotion"
  },
  {
    c: "👍",
    n: "thumbs up",
    s: "thumbsup",
    k: ["good", "yes", "approve", "like", "hand"],
    t: true,
    cat: "People & Body"
  },
  {
    c: "👎",
    n: "thumbs down",
    s: "thumbsdown",
    k: ["bad", "no", "disapprove", "dislike", "hand"],
    t: true,
    cat: "People & Body"
  },

  // Objects & Tech
  {
    c: "💻",
    n: "laptop computer",
    s: "computer",
    k: ["laptop", "computer", "tech", "code", "dev"],
    t: false,
    cat: "Objects"
  },
  {
    c: "📱",
    n: "mobile phone",
    s: "iphone",
    k: ["phone", "mobile", "cell", "smartphone"],
    t: false,
    cat: "Objects"
  },
  {
    c: "🖥️",
    n: "desktop computer",
    s: "desktop_computer",
    k: ["desktop", "computer", "monitor", "screen"],
    t: false,
    cat: "Objects"
  },
  {
    c: "⌨️",
    n: "keyboard",
    s: "keyboard",
    k: ["keyboard", "type", "input", "computer"],
    t: false,
    cat: "Objects"
  },

  // Symbols & Development
  {
    c: "🚀",
    n: "rocket",
    s: "rocket",
    k: ["rocket", "launch", "deploy", "fast", "space"],
    t: false,
    cat: "Travel & Places"
  },
  {
    c: "⚡",
    n: "high voltage",
    s: "zap",
    k: ["lightning", "fast", "energy", "power", "electric"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "🔥",
    n: "fire",
    s: "fire",
    k: ["fire", "hot", "flame", "burn"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "✅",
    n: "check mark button",
    s: "white_check_mark",
    k: ["check", "done", "complete", "success", "yes"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "❌",
    n: "cross mark",
    s: "x",
    k: ["x", "cross", "no", "error", "fail", "wrong"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "⚠️",
    n: "warning sign",
    s: "warning",
    k: ["warning", "caution", "alert", "danger"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "🐛",
    n: "bug",
    s: "bug",
    k: ["bug", "insect", "error", "debug", "issue"],
    t: false,
    cat: "Animals & Nature"
  },
  {
    c: "🔧",
    n: "wrench",
    s: "wrench",
    k: ["wrench", "tool", "fix", "repair", "settings"],
    t: false,
    cat: "Objects"
  },
  {
    c: "⚙️",
    n: "gear",
    s: "gear",
    k: ["gear", "settings", "config", "cog", "mechanical"],
    t: false,
    cat: "Objects"
  },
  {
    c: "📊",
    n: "bar chart",
    s: "bar_chart",
    k: ["chart", "graph", "data", "analytics", "stats"],
    t: false,
    cat: "Objects"
  },

  // Git & Version Control
  {
    c: "🎉",
    n: "party popper",
    s: "tada",
    k: ["party", "celebration", "tada", "release", "launch"],
    t: false,
    cat: "Activities"
  },
  {
    c: "🔀",
    n: "twisted rightwards arrows",
    s: "twisted_rightwards_arrows",
    k: ["merge", "branch", "git", "arrows", "combine"],
    t: false,
    cat: "Symbols"
  },
  {
    c: "📝",
    n: "memo",
    s: "memo",
    k: ["memo", "note", "write", "document", "text"],
    t: false,
    cat: "Objects"
  },
  {
    c: "🔒",
    n: "locked",
    s: "lock",
    k: ["lock", "secure", "private", "closed", "security"],
    t: false,
    cat: "Objects"
  },
  {
    c: "🔓",
    n: "unlocked",
    s: "unlock",
    k: ["unlock", "open", "public", "unlocked", "security"],
    t: false,
    cat: "Objects"
  }
];

export const categories = [
  "All",
  "Smileys & Emotion",
  "People & Body", 
  "Animals & Nature",
  "Objects",
  "Symbols",
  "Travel & Places",
  "Activities"
];

// Skin tone modifiers
export const skinTones = [
  { name: "Default", modifier: "" },
  { name: "Light", modifier: "🏻" },
  { name: "Medium-Light", modifier: "🏼" },
  { name: "Medium", modifier: "🏽" },
  { name: "Medium-Dark", modifier: "🏾" },
  { name: "Dark", modifier: "🏿" }
];