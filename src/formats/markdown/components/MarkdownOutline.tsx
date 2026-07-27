import React from "react";
import type { OutlineHeading } from "../useOutline";

interface MarkdownOutlineProps {
  headings: OutlineHeading[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Section rail for the Markdown preview.
 *
 * Sits in the gutter the centred measure leaves behind, so showing it never
 * moves the prose column. `MarkdownPreview` decides when there is room.
 */
const MarkdownOutline: React.FC<MarkdownOutlineProps> = ({
  headings,
  activeId,
  onSelect,
}) => (
  <nav
    className="md-outline"
    aria-label="Document outline"
    data-testid="markdown-outline"
  >
    <div className="md-outline__inner">
      <p className="md-outline__title">On this page</p>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="md-outline__link"
              data-level={heading.level}
              aria-current={heading.id === activeId ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSelect(heading.id);
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);

export default MarkdownOutline;
