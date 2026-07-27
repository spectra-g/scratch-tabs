import { useEffect, useState } from "react";
import type React from "react";

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
}

/** Levels deep enough to be worth navigating to; h5/h6 would just add noise. */
const HEADING_SELECTOR = "h1[id], h2[id], h3[id], h4[id]";

/**
 * Reads headings out of the rendered preview and tracks which one the reader is
 * currently in.
 *
 * Headings come from the DOM rather than from the Markdown source, so the ids
 * here are by construction the same ones the heading elements carry - there is
 * no second slugging pass that could drift out of step.
 *
 * `content` is a dependency only as a signal that the DOM has been re-rendered;
 * the headings themselves are always read from the DOM.
 */
export function useOutline(
  containerRef: React.RefObject<HTMLElement | null>,
  content: string,
): { headings: OutlineHeading[]; activeId: string | null } {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // react-markdown commits synchronously with the render this effect belongs
    // to, so the headings are already in the DOM by the time this runs.
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
    );

    const found = elements.map((element) => ({
      id: element.id,
      text: element.textContent?.replace(/#$/, "").trim() ?? "",
      level: Number(element.tagName.slice(1)),
    }));

    setHeadings(found);
    setActiveId((current) =>
      found.some((heading) => heading.id === current)
        ? current
        : (found[0]?.id ?? null),
    );

    if (elements.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    // A band across the top of the viewport: the active entry is the last
    // heading to have crossed it, which matches what a reader perceives as
    // "where I am" far better than whichever heading happens to be centred.
    const observer = new IntersectionObserver(
      (entries) => {
        const crossed = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.id);
        if (crossed.length > 0) setActiveId(crossed[crossed.length - 1]);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [containerRef, content]);

  return { headings, activeId };
}
