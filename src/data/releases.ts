// Auto-generated from releases.yml - DO NOT EDIT MANUALLY
// Run: cd changelog && node generate.js

export interface ReleaseCategory {
  name: string;
  changes: string[];
}

export interface Release {
  version: string;
  type: 'latest' | 'release' | 'beta' | 'alpha';
  date: string;
  headline: string;
  summary: string;
  categories: ReleaseCategory[];
}

export const APP_VERSION = '1.29.0';

export const RELEASES: Release[] = [
  {
    "version": "1.29.0",
    "type": "latest",
    "date": "2026-05-21",
    "headline": "Hex Viewer / Binary Inspector, PEM / X.509 & .env Smart Views, 11 New Pipeline Operations",
    "summary": "Professional offline hex viewer and binary inspector with data decoding, entropy analysis, and byte editing; full certificate viewer with chain analysis and validity timeline; interactive .env editor with sort, clean, and export; plus Morse, NATO, Shannon entropy, URL defang/refang, and CSV filter/sort/transpose pipeline operations",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Hex Viewer / Binary Inspector:** Professional offline hex viewer supporting four input modes — paste raw text, hex string, or Base64, or upload any binary file up to 2 MB; all rendering and analysis runs entirely in the browser",
          "**Interactive Hex Grid:** Paginated grid with configurable bytes-per-row (8/16/32) and page size; click a byte to select it, Shift+click to extend the selection to a range",
          "**In-Grid Byte Editing:** Double-click any byte cell to edit its value directly in the hex grid; changes sync back to the source editor panel and update the input text in real time",
          "**Data Inspector Sidebar:** Decodes the selected byte offset into every standard numeric type — Binary (8-bit), Int8, Uint8, Int16, Uint16, Int32, Uint32, Int64, Uint64 (BigInt), Float32, Float64, and ASCII character; endianness toggle switches all multi-byte reads between little-endian and big-endian instantly",
          "**Shannon Entropy Analysis:** Calculates information density for the full buffer or the active selection with a rated label — Low (structured), Low-Medium (text/source), Medium (dense binary/executable), High (compressed/media), Very High (encrypted/compressed)",
          "**Byte Distribution Stats:** Breaks the buffer into four categories — null bytes, printable ASCII, control characters, and extended bytes — with percentage bars so file composition is visible at a glance",
          "**Search:** Find any text string or hex sequence across the buffer; match count and current position are shown in the toolbar; next/previous navigation jumps to each match and pages to it automatically",
          "**Export:** Copy the full buffer or active selection as space-separated hex, raw hex, Base64, C array (`unsigned char rawData[]`), JSON number array, or download as a raw binary file",
          "**Smart Format Detection:** When content is sent from an editor tab, the input format is auto-detected — hex strings are opened in hex mode, Base64-padded strings in base64 mode, everything else as raw text",
          "**Context Action:** Any editor tab gains an 'Open in Hex Viewer' option in the right-click menu, sending the tab's content directly to a new Hex Viewer tab",
          "**PEM / X.509 Smart View:** Parses certificates, private keys, public keys, and CSRs in the browser using a pure-JS DER/ASN.1 engine — no native dependencies, no server calls",
          "**Certificate Detail Panel:** Subject and issuer distinguished names, serial number, version, signature algorithm, validity dates, Subject Alternative Names (DNS, IP, Email, URI), Key Usage, and Extended Key Usage",
          "**Validity Timeline:** Visual progress bar showing where today falls in the certificate's validity window — green when healthy, amber when expiring within 30 days, red when expired",
          "**SHA-256 Fingerprint:** Computed asynchronously via the SubtleCrypto Web API and displayed as uppercase colon-separated hex pairs",
          "**RSA Key-Size Detection:** Reads the SubjectPublicKeyInfo modulus to report key length in bits; colour-coded badge highlights weak keys (<2048-bit in red, ≥4096-bit in green)",
          "**Certificate Chain Analysis:** Links intermediate and leaf certificates to their issuer by matching subject/issuer CN and O fields; chain-root certificates are labelled",
          "**CA, Self-Signed & Root Badges:** Each certificate card shows the relevant badges so the role in a chain is immediately clear",
          "**Split Certificates:** When a PEM bundle contains multiple certificates, a Split button opens each as its own tab with the CN as the title",
          "**Key & CSR Support:** Private key blocks show key type and a 'never share' warning; public key blocks show key type; CSR blocks surface the subject DN",
          "**.env Smart View:** Interactive variable editor — click any key or value to edit inline; commits on Enter or blur, cancels on Escape",
          "**Type Inference & Icons:** Each variable is annotated as URL, boolean, number, JSON, secret, or string with a matching icon and colour",
          "**Secret Masking:** Keys matching secret patterns (API_KEY, TOKEN, PASSWORD…) are auto-masked with a reveal/hide toggle",
          "**Sort A → Z:** Alphabetically sorts keys while keeping comment-delimited sections intact — comments travel with their block",
          "**Group by Prefix:** Reorganises variables by their first underscore-delimited component (DB_, APP_, AWS_…) with auto-generated section headers",
          "**Remove Duplicates:** Scans for repeated keys and keeps only the last occurrence, matching shell semantics",
          "**Clean Operations:** Strip comments, collapse consecutive blank lines to one, or remove all blank lines",
          "**Export as JSON / Shell / Docker:** One-click conversion opens the variable set as a new tab — pretty JSON object, `export KEY=\"value\"` shell script, or Docker `-e KEY=\"value\"` flags",
          "**Validation Panel:** Surfaces duplicate keys and empty values with counts; duplicate-key link triggers remove-duplicates in one click",
          "**Search & Filter:** Live search across key names and values narrows the visible rows without modifying the file",
          "**Add & Delete Variables:** Add button appends a new editable row; per-row delete removes the variable from the file",
          "**Morse Code Encode/Decode:** Convert text to Morse code (dots and dashes) and back — configurable word separator (slash, pipe, or newline); round-trips correctly for all alphanumeric and punctuation characters in the standard ITU table",
          "**NATO Phonetic Alphabet:** Convert text to NATO words (A → Alfa, B → Bravo…) with delimiter options (space, newline, comma, dash) and uppercase toggle — covers A–Z, 0–9, and space",
          "**Unicode Escape/Unescape:** Escape characters to \\uXXXX sequences (non-ASCII only or all characters) and decode them back — handles both \\uXXXX and \\u{XXXXX} surrogate-pair form for emoji and supplementary code points",
          "**Shannon Entropy:** Calculate information density in bits/character — full report mode shows entropy, length, unique character count, and theoretical maximum; value-only mode outputs a single number for pipeline chaining",
          "**Defang URL:** Replace https:// → hxxps://, http:// → hxxp://, and dots → [.] for safe sharing in threat intelligence reports and IOC feeds — each substitution is independently toggleable",
          "**Refang URL:** Reverse all common defang substitutions (hxxps://, [.], [@], [:]) back to working URLs — handles case-insensitive hxxp variants and colon-bracket notation",
          "**Filter CSV Rows:** Keep rows where a column matches a condition — supports contains, not-contains, equals, not-equals, regex, greater-than, and less-than operators with optional case sensitivity; works by header name or column index",
          "**Sort CSV:** Sort rows by any column ascending or descending — auto-detects numeric columns or use explicit string/number mode; preserves the header row",
          "**Transpose CSV:** Swap rows and columns — each input row becomes a column in the output; handles unequal row lengths by padding with empty cells; preserves quoting throughout"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Tab bar action buttons obscured by scroll gradient:** The scroll indicator gradients are now scoped to the tab scroll area via a dedicated wrapper element; previously the right-side gradient could paint over the Plus, Clipboard, and Extension buttons when the tab bar was scrolled left, making the icons go dark",
          "**Context menu clipped at viewport edges:** The tab context menu now measures its rendered dimensions with `useLayoutEffect` and adjusts its position before becoming visible, preventing the menu from being cut off at the bottom or right edges of the viewport",
          "**Submenu overflows viewport right edge:** Context menu submenus that would extend beyond the right edge of the viewport now flip to open leftward instead; previously they would render off-screen and be inaccessible"
        ]
      }
    ]
  },
  {
    "version": "1.28.0",
    "type": "release",
    "date": "2026-05-19",
    "headline": "SSH Key Generator & TOTP 2FA Generator",
    "summary": "Two new offline security tablets: generate Ed25519, RSA, and ECDSA SSH key pairs with passphrase encryption, inspect and validate any key — plus a multi-account TOTP authenticator with animated countdown rings",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**SSH Key Generator:** Generate Ed25519, RSA-3072, RSA-4096, and ECDSA P-256/P-384/P-521 key pairs entirely in the browser — no server calls, no data leaves the device",
          "**OpenSSH-Compatible Output:** Private keys are written in the standard OpenSSH v1 format (AES-256-CBC + bcrypt_pbkdf KDF, 16 rounds) — immediately usable with `ssh-add`, `ssh-keygen`, and any compliant SSH client",
          "**Passphrase Encryption:** Optionally protect the private key with a passphrase; the field persists between generations so you can generate multiple keys without re-entering it",
          "**Key Inspector:** Paste any SSH public or private key to see algorithm, bit length, SHA-256 fingerprint (matching `ssh-keygen -l`), MD5 fingerprint, and encryption status — derives the `authorized_keys` line from an unencrypted private key without decryption",
          "**Pair Validator:** Confirm that a public key and private key belong to the same pair by comparing their embedded wire-format public key bytes",
          "**Copy & Download:** One-click copy and download buttons for both keys; private key downloads as `id_ed25519` / `id_rsa` / `id_ecdsa` and public key as the `.pub` counterpart",
          "**Zero Persistence:** No key material, passphrases, or generated results are ever written to IndexedDB — only the selected algorithm, comment, and tab preference are saved",
          "**TOTP 2FA Generator:** Multi-account authenticator tablet — add as many TOTP accounts as needed, each stored locally and generating a fresh code every period",
          "**Animated Countdown Ring:** Per-account SVG ring depletes smoothly as the OTP window expires; turns amber with a numeric countdown in the final 5 seconds to signal an imminent rotation",
          "**otpauth:// URI Import:** Paste any `otpauth://totp/...` URI to auto-populate label, issuer, secret, algorithm, digits, and period in one click — compatible with Google Authenticator, Aegis, and standard 2FA QR codes",
          "**Manual Entry:** Add accounts manually with label, issuer, Base32 secret (show/hide toggle), algorithm (SHA1/SHA256/SHA512), digit count (6/7/8), and custom period — inline Base32 validation and a live code preview appear as you type",
          "**Edit & Delete:** Modify any account's details or remove it via the per-card overflow menu",
          "**One-Click Copy:** Copy the current OTP to the clipboard directly from the account card with a 1.5-second green tick confirmation",
          "**Verify Panel:** Standalone tab to check a code against a raw Base32 secret without adding an account — returns Valid, Invalid, or Clock Skew with the exact drift in seconds",
          "**Color-Coded Accounts:** Each account receives a deterministic HSL color derived from its label, shown as a dot on the card and as the ring stroke color"
        ]
      }
    ]
  },
  {
    "version": "1.27.0",
    "type": "release",
    "date": "2026-05-13",
    "headline": "QR Code Generator",
    "summary": "Full offline QR code generation and decoding — 8 content types, visual customisation, logo embedding, and a history strip, with no data leaving the browser",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**QR Code Generator:** Eight smart content types — URL, Text, WiFi, Email, Phone, SMS, vCard, and Location — each with a dedicated form that formats the correct URI scheme (WIFI:T:..., mailto:, tel:, smsto:, BEGIN:VCARD, geo:) automatically",
          "**Visual Customisation:** Dot style (6 variants), corner frame style (3 variants), dot and background colour pickers, transparent background toggle (SVG), error correction level (L 7% / M 15% / Q 25% / H 30%), output size (256–2048 px), and margin slider",
          "**Logo Embedding:** Drag-and-drop or file-pick PNG/SVG/JPEG logos (max 2 MB), resized client-side to ≤200 px; auto-bumps error correction to H with a scanability indicator when logo coverage exceeds 30%",
          "**Decode Tab:** Drop a QR image, paste from clipboard (Ctrl+V), or pick a file — jsQR decodes it entirely in-browser with smart content-type detection and a 'Send to Generate' action to load the result back into the generator",
          "**History Strip:** Last 8 generated QR codes stored as thumbnails; click any to restore its content, style, and logo",
          "**Auto-Detection:** Pasting a URL, WIFI:T:..., mailto:, or vCard string into the URL field shows a 'Detected: X — Switch' pill for one-click content-type switching",
          "**Geo Location:** 'Use my location' button on the Location type populates coordinates via the browser Geolocation API",
          "**Context Action:** Any editor tab containing a URL gains a 'Generate QR Code' option in the right-click actions menu",
          "**Privacy Footer:** Permanently visible 'Generated in your browser — no data leaves your device' footer"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Safari clipboard:** Copy PNG now passes the blob Promise directly into ClipboardItem so it is constructed synchronously within the user-gesture frame, satisfying Safari's strict clipboard API requirement",
          "**vCard line endings:** vCard 3.0 output now uses CRLF (\\r\\n) as required by RFC 2426; added the mandatory N: field (Last;First;;;) and TYPE annotations on TEL and EMAIL properties for correct iOS Contacts parsing"
        ]
      }
    ]
  },
  {
    "version": "1.26.0",
    "type": "release",
    "date": "2026-05-13",
    "headline": "TOML Smart View & 4 New Pipeline Operations",
    "summary": "Full TOML format support with Structure Explorer smart view, custom syntax highlighting, and TOMLJSON/YAML pipeline conversions",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**TOML Smart View:** Structure Explorer with resizable tree/editor split — browse tables, arrays-of-tables, and all scalar types in a virtualised tree alongside the Monaco editor",
          "**TOML Syntax Highlighting:** Custom Monarch tokenizer with colour-coded table headers, keys, strings, numbers, booleans, datetimes, inline tables, and array delimiters",
          "**TOML Auto-Detection:** Confidently distinguishes TOML from INI using array-of-tables `[[t]]`, RFC 3339 datetimes, dotted keys, inline tables, and multi-line strings as strong signals; penalises `;` comments and colon-delimited values that indicate INI",
          "**TOMLJSON Pipeline Operations:** `toml.to-json` and `json.to-toml` with configurable indent size",
          "**TOMLYAML Pipeline Operations:** `toml.to-yaml` and `yaml.to-toml` with configurable indent size; `yaml.to-toml` raises a clear error when the YAML root is an array (not valid at TOML root)",
          "**Convert to JSON / YAML:** Toolbar convert dropdown in the TOML smart view opens the converted output in a new background tab"
        ]
      }
    ]
  },
  {
    "version": "1.25.0",
    "type": "release",
    "date": "2026-05-12",
    "headline": "17 New Pipeline Operations - Encoding, Compression, Hashing, Networking & Datetime",
    "summary": "Format Date, binary/octal/Base32/Base58 encoding, Raw Deflate and Zlib compression, SHA hash digest, IPv4 format conversion, and JSONPath queries",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Format Date:** Parse any date string and reformat it - accepts ISO 8601, SQL datetime, Unix timestamps (seconds or milliseconds), natural language (yesterday, 2 hours ago), and more as input",
          "**11 date output presets:** ISO 8601, date-only, SQL, RFC 3339, HTTP/RFC 7231, human, full human (with weekday), relative time, Unix seconds, Unix milliseconds, and custom date-fns format string",
          "**Per-line date processing:** Configurable mode converts a list of dates line-by-line in a single pipeline step",
          "**To/From Binary:** Convert text to space-separated binary bit strings (e.g. `A` → `01000001`) and back - delimiter options: space, none, comma, newline",
          "**To/From Octal:** Convert text to octal byte values (e.g. `A` → `101`) and back - delimiter options: space, backslash, none, comma",
          "**Base32 Encode/Decode:** RFC 4648 standard Base32 with optional padding control - useful for TOTP/2FA secrets and DNS encodings",
          "**Base58 Encode/Decode:** Bitcoin/IPFS alphabet Base58 - useful for wallet addresses, CIDs, and SSH key fingerprints",
          "**Raw Deflate / Raw Inflate:** Compress and decompress using Raw Deflate (no header), output as Base64",
          "**Zlib Deflate / Zlib Inflate:** Compress and decompress using Zlib-wrapped Deflate, output as Base64",
          "**Hash / Digest:** Generate SHA-1, SHA-256, SHA-384, or SHA-512 hashes with hex or Base64 output - composable per-line or full-text",
          "**Change IP Format:** Convert IPv4 addresses in-place between dotted decimal, decimal integer (e.g. `3232235777`), hex (`0xC0A80101`), and dotted octal - works on embedded IPs in log lines",
          "**JSONPath Query:** Apply a JSONPath expression to JSON input and output results as pretty JSON, compact JSON, or one value per line (e.g. `$.users[*].name`)",
          "**Diagram Tablet - Resizable split:** Drag the vertical divider between the Mermaid code editor and diagram preview to adjust the split ratio - uses the same drag handle as the Markdown preview",
          "**Diagram Tablet - Maximize view:** New toolbar toggle (split  maximize icons) collapses the editor to show the diagram full-width, then restores the split with one click"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Diagram Tablet - Label clipping:** Fixed right-side clipping of node label text (e.g. `Decision?`, `Action 1`) caused by Mermaid slightly under-calculating the SVG viewBox width - an 8px padding is now added to every side of the viewBox before display"
        ]
      }
    ]
  },
  {
    "version": "1.24.1",
    "type": "release",
    "date": "2026-05-11",
    "headline": "Editor Copy/Paste Fix",
    "summary": "Restored right-click Copy and Paste in the Monaco editor context menu, broken by a Monaco 0.54 upgrade",
    "categories": [
      {
        "name": "Bug Fixes",
        "changes": [
          "**Right-click Copy:** Fixed Copy in the editor context menu not putting selected text on the clipboard (Monaco 0.54 EditContext API regression)",
          "**Right-click Paste:** Fixed Paste in the editor context menu doing nothing when clicked (Monaco 0.54 shadow DOM focus regression)",
          "**Sidebar height on large screens:** Fixed the sidebar workspace list cutting off before the bottom of the screen on tall displays - list now expands to fill the full available height",
          "**CSV masked column copy feedback:** Fixed copy icon in password/sensitive columns not switching to a green tick after copying - now shows the same 2-second success indicator as regular columns"
        ]
      }
    ]
  },
  {
    "version": "1.24.0",
    "type": "release",
    "date": "2026-02-26",
    "headline": "Open-Source Readiness",
    "summary": "Prepared the project for open-source release with repository hygiene, public docs, and contributor-facing updates",
    "categories": [
      {
        "name": "Open Source",
        "changes": [
          "**Repository hygiene:** Removed internal-only notes/scripts and cleaned ignored local artifacts",
          "**Public docs added:** Added README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY policies",
          "**Content sanitization:** Replaced organization-specific test fixtures and headers with neutral generic examples",
          "**Landing updates:** Added concise open-source mentions in key landing pages and FAQ",
          "**Changelog refresh:** Added this release and regenerated changelog outputs"
        ]
      }
    ]
  },
  {
    "version": "1.23.1",
    "type": "release",
    "date": "2026-02-23",
    "headline": "Sidebar Polish & Inline Renaming",
    "summary": "Introducing inline renaming for workspaces and tabs directly in the sidebar, plus performance and UX improvements",
    "categories": [
      {
        "name": "Improvements",
        "changes": [
          "**Inline Sidebar Renaming:** Rename workspaces and tabs directly in the sidebar tree without opening separate modals. Simply double-click or use the context menu to enter edit mode."
        ]
      }
    ]
  },
  {
    "version": "1.23.0",
    "type": "release",
    "date": "2026-02-01",
    "headline": "JSON Smart View Enhancements & 25 New Pipeline Operations",
    "summary": "Streamlined JSON toolbar with quick-access Stringify/Unstringify, redesigned JMESPath Query Panel, plus 25 new transformation pipeline operations",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Documentation Export Modal:** New 'Export Docs' button in JSON toolbar opens a powerful privacy tool for sharing JSON in documentation - mask sensitive values, replace with type placeholders, or remove fields entirely before sharing",
          "**Path-Level Privacy Control:** Configure each JSON path individually with four modes: Keep (original value), Mask (replace with ***), Type (show data type like <string>), or Remove (delete from output)",
          "**Depth-Grouped Path Browser:** Paths organized by nesting depth (Top Level, Level 2, etc.) with bulk actions per group - quickly mask all deeply nested fields while keeping top-level structure",
          "**Live Documentation Preview:** Side-by-side view with instant preview of masked JSON, click any path to navigate to its location in the preview editor",
          "**Quick-Access Stringify/Unstringify:** Moved from Toolbox menu to main Editor Actions toolbar - escape and unescape JSON strings with one click without navigating menus",
          "**Auto-Populated Query Panel:** JMESPath Query Panel now automatically populates and runs the first contextual sample query when opened - see results immediately without typing",
          "**25 New Pipeline Operations:** Major expansion of transformation pipeline capabilities across multiple categories"
        ]
      },
      {
        "name": "Pipeline Operations",
        "changes": [
          "**Encoding Operations:** To Hex (with delimiter options), To Charcode (decimal/hex/binary output), HTML Entity Encode (special chars, named entities, numeric/hex modes)",
          "**Compression:** Gzip Compress (outputs Base64, completes the gunzip pair)",
          "**Data Conversion:** CSV to JSON (with number/boolean parsing), JSON to CSV (with nested object flattening), CSV to Markdown Table, JSON to Markdown Table (perfect for documentation)",
          "**XML Operations:** Format XML (pretty-print), Minify XML, XML to JSON, JSON to XML (bidirectional conversion with attribute support)",
          "**URL Operations:** JSON to Query String (with array format options: repeat, brackets, indices, comma), Query String to JSON (with type parsing)",
          "**DateTime Operations:** To Unix Timestamp (parse dates or get current time in seconds/milliseconds)",
          "**Text Operations:** Reverse Text (entire text, per-line, or per-word modes), Text Statistics (character, word, line, sentence, paragraph counts with JSON output)",
          "**Extraction Operations:** Extract Numbers (integers, decimals, with negative number support), Extract Phone Numbers (US, international, all formats), Extract Dates (ISO, US, EU formats)",
          "**Utility Generators:** Generate UUID (v4 random, v7 time-ordered with format options), Generate Random String (alphanumeric, hex, URL-safe, with symbols), Lorem Ipsum Generator (paragraphs, sentences, words), Generate Sequence (numbers, letters, Roman numerals with custom ranges)"
        ]
      }
    ]
  },
  {
    "version": "1.22.0",
    "type": "release",
    "date": "2026-01-29",
    "headline": "Persistent Sidebar State & Pipeline Operations Expansion",
    "summary": "Sidebar preferences now persist across sessions, plus 15 new powerful transformation pipeline operations for data processing workflows",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Persistent Sidebar Width:** Custom sidebar width (150px-600px) is automatically saved and restored on app reload",
          "**Persistent Sidebar State:** Sidebar expanded/collapsed state persists across sessions - your preferred view mode is remembered",
          "**Persistent Workspace Expansion:** Workspace expansion states in the sidebar tree are saved - return to find your workspaces exactly as you left them",
          "**15 New Pipeline Operations:** Massive expansion of transformation pipeline with web parsing (HTML strip tags, JWT decode), code formatting (SQL/CSS prettify, SQL escape), data conversion (YAMLJSON, CSV column extraction), cryptography (HMAC, base conversion), and text analysis (slugify, frequency analysis, diacritics removal, regex capture groups, quoted-printable decode)"
        ]
      }
    ]
  },
  {
    "version": "1.21.0",
    "type": "release",
    "date": "2026-01-29",
    "headline": "Share Customization, Curl UI Polish & Regex Engine Refined",
    "summary": "Manual content trimming for privacy-safe sharing, compact professional Curl Smart View redesign, and refined Regex Plain English engine",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Manual Content Customization:** New \"Customize Content\" button in Share modal lets you manually trim content even when it fits within URL limits - exclude sensitive fields from JSON objects, select specific line ranges from text content, or reduce clutter by sharing only relevant data for privacy-safe collaboration",
          "**Privacy-First JSON Sharing:** Selectively deselect sensitive fields (passwords, tokens, internal IDs) from JSON before sharing - maintain valid structure while excluding private data",
          "**Flexible Line Range Selection:** Choose specific line ranges to share from text content without manually editing - perfect for sharing relevant snippets while excluding debug logs or sensitive information",
          "**Modern Regex Syntax Support:** Added full support for Unicode property escapes (`\\p{...}`), hex escapes (`\\xHH`), and named backreferences (`\\k<name>`) to the Regex Plain English interpreter"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Advanced Regex Semantic Engine:** Upgraded the \"Plain English\" interpreter to use a sophisticated AST-based parser with literal-aware semantic analysis - provides more robust recognition of complex patterns (emails, dates, SSNs) and gracefully handles incomplete or malformed regexes",
          "**Natural Language Flow:** Improved explanation logic with sequential connectors (e.g., \"...and then ensures...\") and deduplicated phrasing for a more human, readable flow in complex validation patterns",
          "**Strict Pattern Matching:** Refined numeric pattern matchers to eliminate false positives in partially alphanumeric strings while maintaining high accuracy for standard formats",
          "**Curl Smart View Compact Design:** Redesigned with 25-37% tighter spacing for a more professional, scannable interface - card padding reduced from 16px to 12px horizontal and 10px vertical, headers from ~56px to ~48px height",
          "**Enhanced Visual Hierarchy:** Method badges now larger and bolder (text-sm, font-semibold) with tracking-wide for instant recognition, domain names displayed in bold to stand out from full URLs, and numbered card indexes (#1, #2) for easy reference"
        ]
      }
    ]
  },
  {
    "version": "1.20.0",
    "type": "release",
    "date": "2026-01-27",
    "headline": "Navigation History & Welcome Screen Redesign",
    "summary": "VS Code-style back/forward navigation with persistence, plus modernized welcome screen with enhanced onboarding",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Global Navigation History:** Track your journey through workspaces and tabs with back/forward navigation - history persists across sessions in IndexedDB, remembers up to 50 entries with FIFO eviction, and automatically skips deleted tabs/workspaces",
          "**Navigation Controls:** Back/Forward buttons in sidebar header with disabled states, plus keyboard shortcuts (Ctrl+Shift+- for back, Ctrl+Shift+= for forward)",
          "**Smart Navigation:** Prevents recording history during back/forward operations to avoid recursion, validates entries before navigation, and handles cross-workspace jumps seamlessly",
          "**Welcome Screen Redesign:** Modernized first-run experience with hero section featuring value proposition and trust badges (Offline & Private, Persisted Locally, No Server Calls), tiered action cards with semantic color theming, and enhanced keyboard shortcut discovery",
          "**Enhanced Onboarding:** Primary action cards for Format JSON (demo Smart View), Dev Tools (25+ utilities), and New Scratch Tab, plus secondary actions for Open File, Paste Content, and Import Workspace - all with clear descriptions and hints"
        ]
      }
    ]
  },
  {
    "version": "1.19.0",
    "type": "release",
    "date": "2026-01-22",
    "headline": "Workspace Sidebar Explorer",
    "summary": "Workspace sidebar with collapsible tree view, icon rail, and intelligent workspace management",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Workspace Sidebar Explorer:** Collapsible tree view showing all workspaces and tabs - expand/collapse workspaces to browse without switching, with clear visual distinction between active and expanded workspaces",
          "**Icon Rail (Collapsed Mode):** Minimal icon rail showing workspace first-letters in themed color badges - toggle between full sidebar and compact rail with Cmd+B or click to expand",
          "**Context Menus:** Right-click workspaces for create/rename/delete actions, right-click tabs for rename/delete/pin/duplicate/move operations",
          "**Auto-Reveal Active Tab:** Sidebar automatically expands active workspace and scrolls to show the current tab when switching via tab bar or keyboard",
          "**Resizable Sidebar:** Drag the resize handle to adjust sidebar width (150px-600px) or drag below 100px to snap-collapse to icon rail with smooth visual feedback"
        ]
      }
    ]
  },
  {
    "version": "1.18.0",
    "type": "release",
    "date": "2026-01-19",
    "headline": "Transformation Pipeline",
    "summary": "CyberChef-style data processing with chainable operations, drag-and-drop reordering, and persistent pipelines",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Transformation Pipeline Editor:** 3-panel interface with operations palette, pipeline canvas, and live preview - chain operations like Trim → Uppercase → Base64 Encode → JSON Format",
          "**37+ Pipeline Operations:** Text processing (case conversion, trim, whitespace), line operations (sort, reverse, dedupe, shuffle), filtering (regex, keyword, keep first/last N), encoding (Base64, URL), checksums, and redaction",
          "**Drag-and-Drop Reordering:** Rearrange pipeline steps with smooth drag-and-drop - each step can be enabled/disabled individually",
          "**Persistent Pipelines:** Save named pipelines and load them across sessions",
          "**Real-Time Preview:** Live output preview with execution stats (duration, character counts) as you build your pipeline"
        ]
      }
    ]
  },
  {
    "version": "1.17.0",
    "type": "release",
    "date": "2026-01-13",
    "headline": "Browser-Style Scrollable Tabs",
    "summary": "Native horizontal scrolling for tabs with visual gradient indicators and touch support",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Horizontal Tab Scrolling:** Tabs now maintain minimum readable width (80px) with variable widths and scroll horizontally when they overflow, preventing tab squashing",
          "**Gradient Scroll Indicators:** Visual masking gradients fade from tab bar background to transparent at edges, clearly indicating when tabs are hidden off-screen and scrollable in both light and dark modes",
          "**Mouse Wheel Scrolling:** Scroll through tabs using vertical mouse wheel gestures over the tab bar for intuitive navigation",
          "**Touch Gesture Support:** Swipe horizontally to scroll through tabs, or long-press (250ms) to drag and reorder tabs - properly distinguishing between scrolling and dragging on touch devices"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Performance Optimization:** Native browser scrolling eliminates expensive resize calculations and render cycles",
          "**Theme-Aware Gradients:** Gradients use CSS variables to match tab bar background color, ensuring visibility in all themes"
        ]
      }
    ]
  },
  {
    "version": "1.16.0",
    "type": "release",
    "date": "2026-01-12",
    "headline": "Macro Recording & Menu Refinement",
    "summary": "New Macro Recording engine with floating toolbar, status bar integration, and refined context menu",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Macro Recording Engine:** Record and replay complex editor interactions including typing, cursors, selection, and deletions with a new engine.",
          "**Floating Macro Toolbar:** New draggable toolbar for Macro controls (Record, Play, Play to End) that appears automatically when recording starts."
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Context Menu Restructure:** significantly reorganized tab context menu for better usability - introducing 'Organize' submenu, top-level 'Share' and 'Duplicate', and clearer grouping.",
          "**Menu Icons:** Updated icons across the context menu for better visual clarity (Share, Organize, Split, etc.).",
          "**Status Bar Refinement:** Cleaned up status bar layout for better information density and visual balance."
        ]
      }
    ]
  },
  {
    "version": "1.15.0",
    "type": "release",
    "date": "2026-01-03",
    "headline": "Colour Palette: Canvas-First UX & Smart Tools",
    "summary": "Complete rewrite with canvas-first interface, intelligent generation, and slide-over feature panels",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Canvas-First Interface:** Complete redesign into a 100% responsive canvas featuring vertical interactive color stripes with direct manipulation.",
          "**Slide-Over Feature Panels:** Peripheral tools (Image Extraction, UI Preview, Accessibility, Export) are now housed in elegant slide-over containers, keeping the main interaction clean.",
          "**Intelligent Palette Generation:** New generation engine using a `useReducer` pattern with space bar shortcuts and full Undo/Redo support.",
          "**Enhanced Image Colour Extraction:** Modern sidebar interface for uploading images and sampling colors via direct click or region-dragging.",
          "**UI Preview & Remix Engine:** Live preview of palettes on real UI components with an intelligent remixing engine and atomic locking.",
          "**Omni-Selector Redesign:** A completely overhauled tool selector featuring weighted fuzzy search, a 'Recently Used' grid, and a high-density list layout for deep discovery.",
          "**Markdown Preview Sync:** Bidirectional scroll synchronization and click-to-navigate between raw markdown editor and live preview - scroll either pane to keep them in sync, or click any preview element to jump to its source line."
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Accessibility Matrix with  Suggestions:** WCAG 2.1 compliance matrix with one-click suggestions to fix contrast failures.",
          "**Multi-Format Export:** Directly export palettes to CSS, SCSS, Tailwind, or JSON, with the ability to create new workspace tabs instantly.",
          "**Centralized Tool Execution:** Unified `ToolService` for all tool types (Tablets, Smart Views, Formats) ensure consistent tab creation and usage tracking.",
          "**Comprehensive Tool Registry Tests:** Added a robust test suite for `ToolService`, `ToolCard`, and `ToolSelectorModal` to guarantee stability and keyboard navigation compliance.",
          "**Smart View Sync Architecture:** Introduced extensible sync configuration system allowing any format (Markdown, HTML, CSV) to provide custom scroll/click synchronization while maintaining architectural separation."
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "**Generation Stability:** Implemented value-based state synchronization and memoization to prevent infinite render loops.",
          "**Color Rendering Consistency:** Guaranteed `#` prefix normalization across all colors to prevent rendering failures."
        ]
      }
    ]
  },
  {
    "version": "1.14.0",
    "type": "release",
    "date": "2025-12-29",
    "headline": "Share Tabs with Privacy-First URLs",
    "summary": "Share tab content via URLs with compression, smart trimming, and hash-based zero-knowledge privacy",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Share Tab URLs:** Generate shareable URLs from any tab via context menu - compressed content embedded directly in the URL for instant sharing",
          "**Structure-Aware JSON Trimming:** Interactive key-selection UI for large JSON objects and arrays - selectively share specific data fields while maintaining valid structure",
          "**Auto-Balancing Greedy Selection:** Intelligent algorithm that automatically unselects heavy fields to fit within URL limits while maximizing smaller, informative keys",
          "**Smart Content Trimming:** Fallback line-range selector for text-based or malformed content ensuring you can always share high-density snippets",
          "**Hash-Based Privacy Routing:** URLs use hash fragments (#/s/...) ensuring content never appears in server logs or network requests - true zero-knowledge sharing",
          "**Visual Size Feedback:** Real-time colour-coded budget bar with individual key weight estimation and \"heavy offender\" warnings"
        ]
      },
      {
        "name": "Privacy & Security",
        "changes": [
          "**Zero-Knowledge Architecture:** Hash routing ensures shared content exists only in browser memory - never transmitted to servers, proxies, or logging systems",
          "**No External Dependencies:** Pure client-side implementation with no third-party services, APIs, or tracking",
          "**URL-Safe Encoding:** Automatic handling of special characters preventing routing conflicts and injection attacks"
        ]
      }
    ]
  },
  {
    "version": "1.13.0",
    "type": "release",
    "date": "2025-12-23",
    "headline": "Date/Time Command Center & Smart Inputs",
    "summary": "Date/Time tablet with command-line inputs, natural language arithmetic, and multi-zone comparison",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart Command Inputs:** Control the tablet via the input field using `> [City]` to add timezones (e.g., `> Tokyo`), `> diff [date]` for duration analysis, or `> next friday` to jump dates.",
          "**\"Command Center\" Layout:** Complete redesign into a multi-column interface optimized for developer workflows, featuring persistent history, grouped conversions, and real-time dashboarding.",
          "**Natural Language Date Arithmetic:** Intelligent parsing engine supporting human-friendly math (e.g., `now + 5d`, `yesterday - 2w`).",
          "**Timezone Explorer:** Compare your entered date/time across multiple configurable timezones with live DST indicators and smart city matching (e.g. \"NYC\", \"London\")."
        ]
      }
    ]
  },
  {
    "version": "1.12.0",
    "type": "release",
    "date": "2025-12-05",
    "headline": "Command Vault Complete Rework",
    "summary": "Command Vault redesign with categories, search, scratchpad, and improved workflow",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Command Vault Redesign:** Complete rework with category-based organization, making it easier to manage and find your command snippets",
          "**Command Search (Ctrl+R):** Quick search across all commands with instant filtering and copy-on-select",
          "**Scratchpad:** Temporary editing space for modifying commands before copying or saving as new entries",
          "**Category Management:** Create, organize, and delete categories to keep your commands structured",
          "**Inline Command Editing:** Click any command to edit in place with auto-save on blur",
          "**Drag-and-Drop Reordering:** Rearrange commands within categories to prioritize frequently used items",
          "**Import/Export:** Bulk import commands from you terminal history with automatic category assignment"
        ]
      }
    ]
  },
  {
    "version": "1.12.0",
    "type": "release",
    "date": "2025-12-03",
    "headline": "Light/Dark Mode & Editor Enhancements",
    "summary": "Theme system with Light/Dark mode toggle, bug fixes, and rich text improvements",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Light/Dark Mode Toggle:** Comprehensive theme system with light and dark modes for editor, smart views, and UI components - seamlessly switch between themes with persistent preference"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Rich Text Bullet Point Indentation:** Enhanced list editing with proper indentation support for nested bullet points"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "**Clipboard Content Comparison:** Fixed auto-formatting issue when comparing with content from clipboard",
          "**Mermaid Diagram Export:** Fixed PNG export functionality for Mermaid diagrams"
        ]
      }
    ]
  },
  {
    "version": "1.11.1",
    "type": "release",
    "date": "2025-11-18",
    "headline": "Bug Fixes",
    "summary": "Fixed clipboard processing in JSON comparison and Mermaid PNG export",
    "categories": [
      {
        "name": "Fixed",
        "changes": [
          "**JSON Compare with Clipboard:** Clipboard content now properly processed through content pipeline when comparing - stringified JSON is automatically unstringified and formatted in diff modal for accurate side-by-side comparison",
          "**Mermaid Diagram PNG Export:** Fixed SecurityError canvas tainting issue preventing PNG export by converting SVG to base64 data URL instead of blob URL"
        ]
      }
    ]
  },
  {
    "version": "1.11.0",
    "type": "release",
    "date": "2025-11-14",
    "headline": "JSON Query Panel & Navigation",
    "summary": "JMESPath query panel, structure-aware navigation, and enhanced CSV editing",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Query Panel:** Interactive JMESPath query tool with live results preview, contextual sample queries generated from actual JSON structure, and built-in JMESPath guide with syntax examples",
          "**Structure-Aware JSON Navigation:** Navigator tree clicks now reliably jump to exact locations in JSON using AST parsing (json-source-map), handling nested keys, missing properties, and edge cases correctly",
          "**CSV Cell Actions:** Clear cell contents, copy cell values, and view full cell values in a modal for large data"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Navigator:** Full horizontal scrolling for long values instead of ellipsis truncation",
          "**JSON Navigator:** Dynamic height adjustment using ResizeObserver for optimal space utilization",
          "**JSON Equality Checker:** Enhanced array mismatch reporting with detailed diff information"
        ]
      }
    ]
  },
  {
    "version": "1.10.0",
    "type": "release",
    "date": "2025-11-12",
    "headline": "JSON & CSV Features",
    "summary": "JSON equality checking, CSV export strategies, and smart delimiter detection",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Deep Equality Checker:** Order-insensitive JSON comparison using canonical hashing, with intelligent array analysis reporting matched, missing, and extra items",
          "**JSON to CSV Export:** Intelligent JSON-to-CSV conversion with three strategies: expandFirst (recommended), expandAll (Cartesian product), and stringify (legacy)",
          "**CSV Paste Cleaner:** Automatically detects and converts literal \\t escape sequences to actual tab characters on paste",
          "**CSV Auto-Delimiter Detection:** Smart View automatically detects tab, comma, semicolon, or pipe delimiters for proper table rendering"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**CSV Export:** Nested objects automatically flattened with dot notation (e.g., user.name → user.name column)",
          "**CSV Export:** Proper CSV escaping for quotes, delimiters, and newlines",
          "**JWT Tablet:** Improved security messaging - clearer explanation of local storage and best practices"
        ]
      }
    ]
  },
  {
    "version": "1.9.0",
    "type": "release",
    "date": "2025-11-11",
    "headline": "JSON Data Extraction and Calculator improvements",
    "summary": "JSON data extraction tool, calculator readability, and bug fixes",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Data Extraction:** Extract and filter values from JSON arrays with live preview, supporting nested paths, comparison operators (==, !=, >, <, >=, <=), and export to new tabs",
          "**Calculator Human Readable Output:** Display calculation results in plain language for better comprehension"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Rich text editor: Date created header now properly isolated from document content",
          "Calculator: Various calculation and operator handling bug fixes",
          "Editor: Blank editor issue after applying transformations"
        ]
      }
    ]
  },
  {
    "version": "1.8.0",
    "type": "release",
    "date": "2025-11-01",
    "headline": "Calculator enhancements, JSON Mapper joins, and smart fixes",
    "summary": "Calculator bit manipulation, JSON Mapper joins, and intelligent auto-fix",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Calculator Bit Toggler:** Interactive bit manipulation tool in programmer mode for binary operations",
          "**Calculator Live Base Converter:** Real-time conversion between decimal, binary, octal, and hexadecimal",
          "**JSON Auto-Fix:** Intelligent JSON repair tool that automatically fixes common syntax errors",
          "**JSON Mapper Joins:** Join on matching identifiers when mapping array items"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Mapper:** Specify naming patterns on mapped files",
          "**Calculator:** Less opportunity to enter incorrect calculator syntax"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "General bug fixes to JSON Mapper"
        ]
      }
    ]
  },
  {
    "version": "1.7.0",
    "type": "release",
    "date": "2025-10-24",
    "headline": "Split tabs, JSON improvements, and bug fixes",
    "summary": "Split tab functionality, JSON sanitize, and smart view enhancements",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Split Tab:** Split tab content into multiple tabs with extensive split configuration controls",
          "**Smart View Callout Widget:** Visual indicator when smart view is available after auto-format detection",
          "**JSON Sanitize:** Added sanitize feature for JSON smart view"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Mapper:** Enhanced filename controls for mapped files in folders with pattern matching and transformation rules",
          "**Diff Viewer:** Now shows files in tab view order for better context"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Compare with JSON smart view bug fix",
          "Pomodoro timer now appears correctly in browser title when running"
        ]
      }
    ]
  },
  {
    "version": "1.6.0",
    "type": "release",
    "date": "2025-10-15",
    "headline": "GraphQL tablet and Pomodoro fixes",
    "summary": "GraphQL query builder with schema introspection and Pomodoro timer fix",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**GraphQL Tablet:** Interactive GraphQL query builder with schema introspection, query validation, and variables support"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Pomodoro timer getting stuck at 00:01 when auto-start next session is enabled"
        ]
      }
    ]
  },
  {
    "version": "1.5.0",
    "type": "release",
    "date": "2025-10-07",
    "headline": "Rich text enhancements and bug fixes",
    "summary": "Rich text headings, underline, separators, and critical bug fixes",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Rich text H1, H2, H3:** Added heading support for better document structure",
          "**Rich text Underline:** Added underline formatting option",
          "**Rich text Separator:** Added horizontal separator for content division"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Rich text table selection bug",
          "IP Details tablet caching IP address issue",
          "Diff Smart View line wrapping causing text overlap"
        ]
      }
    ]
  },
  {
    "version": "1.4.0",
    "type": "release",
    "date": "2025-09-25",
    "headline": "New tablets and improvements",
    "summary": "Five new tablets: Mermaid, Checksum, DateTime, Colour Palette, Lorem Ipsum",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Mermaid Diagram Tablet:** Create flowcharts, sequence diagrams, and more with live preview",
          "**Checksum Tablet:** Generate MD5, SHA-1, SHA-256 checksums for text and files",
          "**DateTime Tablet:** Parse, format, and convert dates across timezones and formats",
          "**Colour Palette Tablet:** Create and export colour palettes with live UI preview",
          "**Lorem Ipsum Tablet:** Generate placeholder text with customizable options",
          "**SVG Smart View:** Live preview SVG with syntax highlighting and optimization"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Enhanced regex explanations with detailed pattern descriptions",
          "Improved language detection algorithms and bug fixes"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Curl multiline JSON body parsing in Smart View"
        ]
      }
    ]
  },
  {
    "version": "1.3.0",
    "type": "release",
    "date": "2025-08-28",
    "headline": "Rich text editing",
    "summary": "Rich text editor with images, tables, lists, and code blocks",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Rich text editing - Images:** Paste and resize images",
          "**Rich text editing - Style:** Create tables, lists, links",
          "**Rich text editing - Code:** Code blocks with highlighting",
          "**Rich text editing - Content:** Convert standard editor content to rich text or import content from other tabs"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View scroll-to from tree node now working at any nested level",
          "Can undo a \"From sample\" action",
          "Format detection issues - now more reliable"
        ]
      }
    ]
  },
  {
    "version": "1.2.0",
    "type": "release",
    "date": "2025-08-15",
    "headline": "Properties and INI Smart View",
    "summary": "Smart Views for Properties and INI formats with editing and conversion",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart View for Properties:** Validate, edit, convert Properties with a dedicated builder",
          "**Smart View for INI:** Validate, edit, convert INI with a dedicated builder",
          "**CSV Smart View:** Search capabilities",
          "**CSV Smart View:** Shift cells to the right where columns are missing"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Improved JSON, CSV and R auto detection algorithms"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View replicating content across multiple tabs"
        ]
      }
    ]
  },
  {
    "version": "1.1.0",
    "type": "release",
    "date": "2025-08-11",
    "headline": "Curl command builder",
    "summary": "Feature-rich Curl command builder Smart View with improved detection",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart View for Curl:** A feature rich Curl command builder"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Improved JSON, Csv and R auto detection algorithms",
          "Search JSON by path OR content",
          "Fix broken JSON option",
          "Search formats (Github request #2)",
          "CTRL+Click for tab close without confirmation (Github request #2)",
          "Middle mouse click for tab close without confirmation (Github request #2)",
          "Larger clickable area for close button (Github request #2)"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View replicating content across multiple tabs",
          "Do not kebab-case already kebab-cased JSON property"
        ]
      }
    ]
  },
  {
    "version": "1.0.0",
    "type": "release",
    "date": "2025-08-06",
    "headline": "Initial Public Release",
    "summary": "First stable release with 50+ tools, multi-tab workspace, and privacy-first design",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**50+ Developer Tools:** JSON editor, JWT decoder, Regex tester, Word count, and more",
          "**Multi-tab Workspace:** Organize your work with persistent tabs and split-view support",
          "**Smart Format Detection:** Automatic recognition and formatting of JSON, YAML, Markdown, CSV, and other common formats",
          "**Smart Views:** Take your editing to the next level with Smart Views, support for JSON, YAML, Markdown, HTML and CSV",
          "**Offline AI Summarization:** Client-side text summarization using WebAssembly (experimental)",
          "**Advanced Diff Tool:** Side-by-side comparison with syntax highlighting",
          "**Workspace Management:** Save, export, and import entire workspaces",
          "**Privacy-First Design:** 100% client-side processing, zero data collection"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Built with React 18 and TypeScript for reliability and performance",
          "Monaco Editor integration for advanced code editing capabilities",
          "IndexedDB for persistent local storage",
          "Service Worker support for process intensive tasks"
        ]
      }
    ]
  },
  {
    "version": "0.9.0-beta",
    "type": "beta",
    "date": "2025-07-20",
    "headline": "Beta Release",
    "summary": "Feature-complete beta with REST client, JWT toolkit, and performance optimizations",
    "categories": [
      {
        "name": "Added",
        "changes": [
          "REST client with environment variables and request history",
          "JWT token decoder, verifier, and signer with multiple algorithms",
          "Advanced JSON transformation tools with jq-like syntax",
          "Batch text processing",
          "CSV Smart View providing extended capabilities",
          "Password and UUID generators with customizable options"
        ]
      },
      {
        "name": "Improved",
        "changes": [
          "Enhanced tab management with drag-and-drop reordering",
          "Better error handling and user feedback",
          "Improved keyboard shortcuts and accessibility",
          "Performance optimizations for large files"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Memory leaks when switching between multiple tabs",
          "Incorrect syntax highlighting for certain file types",
          "Issues with workspace export containing special characters",
          "Mobile layout problems on smaller screens"
        ]
      }
    ]
  },
  {
    "version": "0.8.0-alpha",
    "type": "alpha",
    "date": "2025-05-05",
    "headline": "Alpha Release",
    "summary": "Initial alpha with core tab interface, JSON formatter, and plugin architecture",
    "categories": [
      {
        "name": "Added",
        "changes": [
          "Core tab-based interface with workspace support",
          "Basic JSON formatter and validator",
          "Text editor with syntax highlighting for 20+ languages",
          "Local storage persistence for tabs and settings",
          "Import/export functionality for individual tabs"
        ]
      },
      {
        "name": "Architecture",
        "changes": [
          "Established plugin-based tablet system for extensibility",
          "Implemented privacy-first design principles",
          "Set up development toolchain with TypeScript and Vite",
          "Created comprehensive testing framework"
        ]
      }
    ]
  }
];

export const getLatestRelease = (): Release | undefined => RELEASES[0];

export const getRecentReleases = (count: number = 10): Release[] => RELEASES.slice(0, count);
