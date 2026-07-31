import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, RootContent } from "hast";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Info,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "../../../components/Icons";
import { getCodeLanguage, getCodeText, srcLine } from "../nodeUtils";
import { splitFrontmatter } from "../frontmatter";
import { getLoadedHighlighter, highlightCode, loadHighlighter } from "../highlight";
import { rehypeCallouts, rehypeHeadingIds, CALLOUT_KINDS } from "../rehypePlugins";
import MarkdownOutline from "./MarkdownOutline";
import { useOutline } from "../useOutline";
import { useRootStore } from "../../../stores/rootStore";
import { createTab } from "../../../utils/tabUtils";

interface MarkdownPreviewProps {
  content: string;
}

/** Below this the centre column and the rail would start fighting for room. */
const OUTLINE_MIN_WIDTH = 1040;
/** Below this the page's gutters cost more room than the elevation is worth. */
const PAPER_MIN_WIDTH = 600;
/** One or two headings is a document, not something that needs navigation. */
const OUTLINE_MIN_HEADINGS = 3;

const CALLOUTS = {
  note: { icon: Info, title: "Note" },
  tip: { icon: Sparkles, title: "Tip" },
  important: { icon: MessageSquare, title: "Important" },
  warning: { icon: AlertTriangle, title: "Warning" },
  caution: { icon: ShieldAlert, title: "Caution" },
} as const;

type CalloutKind = keyof typeof CALLOUTS;

const isCalloutKind = (value: unknown): value is CalloutKind =>
  typeof value === "string" && (CALLOUT_KINDS as readonly string[]).includes(value);

/** Re-renders once the on-demand grammar chunk has loaded. */
function useHighlighterReady(): boolean {
  const [ready, setReady] = useState(() => getLoadedHighlighter() !== null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadHighlighter().then((instance) => {
      if (!cancelled && instance) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}

/** lowlight emits only spans and text, so this covers its whole output. */
function renderHighlighted(nodes: RootContent[]): React.ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "text") return node.value;
    if (node.type !== "element") return null;

    const className = node.properties?.className;
    return (
      <span
        key={index}
        className={Array.isArray(className) ? className.join(" ") : undefined}
      >
        {renderHighlighted(node.children)}
      </span>
    );
  });
}

export const CodeBlock: React.FC<{
  node?: Element;
  children?: React.ReactNode;
  lineOffset: number;
}> = ({ node, children, lineOffset }) => {
  const [copied, setCopied] = useState(false);
  const language = getCodeLanguage(node);
  const code = getCodeText(node);
  const { addBackgroundTab } = useRootStore();

  const highlighterReady = useHighlighterReady();
  const highlighted = useMemo(
    // highlighterReady is what makes this recompute once the chunk lands
    () => (highlighterReady ? highlightCode(code, language) : null),
    [code, language, highlighterReady],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions, insecure context) - leave the label as-is
    }
  }, [code]);

  const handleOpenInTab = useCallback(() => {
    const tab = createTab({
      title: language ? `Code snippet.${language}` : "Code snippet",
      content: code,
      language: language ?? "plaintext",
    });
    addBackgroundTab(tab, false);
  }, [code, language, addBackgroundTab]);

  return (
    <div className="md-code-block" data-source-line={srcLine(node, lineOffset)}>
      <div className="md-code-block__bar">
        <div className="md-code-block__actions">
          <button
            type="button"
            onClick={handleCopy}
            className="md-code-block__copy"
            aria-label={copied ? "Copied" : "Copy code"}
            data-testid="markdown-copy-code"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleOpenInTab}
            className="md-code-block__open-tab"
            aria-label="Open in new tab"
            data-testid="markdown-open-code-in-tab"
          >
            <ExternalLink size={12} />
            Open in tab
          </button>
        </div>
        <span className="md-code-block__lang">{language ?? "text"}</span>
      </div>
      <pre className="custom-scrollbar">
        {highlighted ? (
          <code className={language ? `language-${language}` : undefined}>
            {renderHighlighted(highlighted.children)}
          </code>
        ) : (
          children
        )}
      </pre>
    </div>
  );
};

/** Heading with a hover-revealed self link, at every level. */
const heading = (level: 1 | 2 | 3 | 4 | 5 | 6, lineOffset: number) => {
  const Tag = `h${level}` as const;

  const Heading: Components["h1"] = ({ node, id, children }) => (
    <Tag id={id} data-source-line={srcLine(node, lineOffset)}>
      {children}
      {id && (
        <a className="md-anchor" href={`#${id}`} aria-label="Link to this section">
          #
        </a>
      )}
    </Tag>
  );

  return Heading;
};

/**
 * Builds the component map for a given frontmatter offset.
 *
 * Every `data-source-line` has the offset added back: react-markdown only sees
 * the body, so its line numbers start again at 1 after a frontmatter block, and
 * editor sync would otherwise scroll to the wrong place.
 */
function buildComponents(lineOffset: number): Components {
  return {
    pre: ({ node, children }) => (
      <CodeBlock node={node} lineOffset={lineOffset}>
        {children}
      </CodeBlock>
    ),

    table: ({ node, children }) => (
      <div className="md-table-wrap" data-source-line={srcLine(node, lineOffset)}>
        <table>{children}</table>
      </div>
    ),

    a: ({ node, href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-source-line={srcLine(node, lineOffset)}
      >
        {children}
      </a>
    ),

    h1: heading(1, lineOffset),
    h2: heading(2, lineOffset),
    h3: heading(3, lineOffset),
    h4: heading(4, lineOffset),
    h5: heading(5, lineOffset),
    h6: heading(6, lineOffset),

    p: ({ node, children }) => (
      <p data-source-line={srcLine(node, lineOffset)}>{children}</p>
    ),
    li: ({ node, children }) => (
      <li data-source-line={srcLine(node, lineOffset)}>{children}</li>
    ),

    blockquote: ({ node, children }) => {
      const kind = node?.properties?.dataCallout;
      if (!isCalloutKind(kind)) {
        return (
          <blockquote data-source-line={srcLine(node, lineOffset)}>
            {children}
          </blockquote>
        );
      }

      const { icon: Icon, title } = CALLOUTS[kind];
      return (
        <blockquote
          className={`md-callout md-callout--${kind}`}
          data-callout={kind}
          data-source-line={srcLine(node, lineOffset)}
        >
          <p className="md-callout__title">
            <Icon size={15} aria-hidden="true" />
            {title}
          </p>
          {children}
        </blockquote>
      );
    },

    hr: ({ node }) => <hr data-source-line={srcLine(node, lineOffset)} />,
    img: ({ node, src, alt }) => (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        data-source-line={srcLine(node, lineOffset)}
      />
    ),
  };
}

const REHYPE_PLUGINS = [rehypeHeadingIds, rehypeCallouts];
const REMARK_PLUGINS = [remarkGfm];

/**
 * Rendered Markdown for the side-by-side smart view.
 *
 * Styling lives in the `.md-preview` block in index.css so that every colour
 * resolves from the semantic theme tokens. Inline vs. fenced code is
 * distinguished there by selector (`:not(pre) > code` vs. `pre code`) rather
 * than in JS - react-markdown no longer reports an `inline` flag.
 */
const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const docRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const { entries, body, lineOffset } = useMemo(
    () => splitFrontmatter(content),
    [content],
  );
  const components = useMemo(() => buildComponents(lineOffset), [lineOffset]);
  const { headings, activeId } = useOutline(docRef, body);

  useEffect(() => {
    const element = docRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleSelect = useCallback((id: string) => {
    const target = docRef.current?.querySelector(`#${CSS.escape(id)}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const showOutline =
    width >= OUTLINE_MIN_WIDTH && headings.length >= OUTLINE_MIN_HEADINGS;
  // Width 0 means nothing has been measured yet; assume there is room rather
  // than flashing the flush layout on first paint.
  const narrow = width > 0 && width < PAPER_MIN_WIDTH;

  return (
    <div
      className="md-doc"
      ref={docRef}
      data-outline={showOutline || undefined}
      data-narrow={narrow || undefined}
    >
      {showOutline && (
        <MarkdownOutline
          headings={headings}
          activeId={activeId}
          onSelect={handleSelect}
        />
      )}

      <div className="md-preview">
        {entries.length > 0 && (
          <dl className="md-frontmatter" data-testid="markdown-frontmatter">
            {entries.map(({ key, value }) => (
              <div key={key} className="md-frontmatter__row">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={components}
        >
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownPreview;
