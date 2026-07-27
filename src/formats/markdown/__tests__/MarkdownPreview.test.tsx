import { render, screen } from "@testing-library/react";
import MarkdownPreview from "../components/MarkdownPreview";

/**
 * react-markdown is mocked in this project (it is ESM-only), so it renders its
 * children verbatim rather than parsing them. That limits this file to what the
 * component does *around* the markdown render - the frontmatter card, the
 * outline gate, and the wrapper structure.
 *
 * The parsing-dependent behaviour is covered where it actually lives:
 * heading ids and callouts in rehypePlugins.test.ts, fence highlighting in
 * highlight.test.ts, and source lines in nodeUtils.test.ts.
 */
describe("MarkdownPreview", () => {
  it("renders the prose column inside the document wrapper", () => {
    const { container } = render(<MarkdownPreview content="# Heading" />);

    expect(container.querySelector(".md-doc .md-preview")).not.toBeNull();
  });

  describe("frontmatter", () => {
    it("renders the block as a metadata card", () => {
      render(<MarkdownPreview content={"---\ntitle: My Doc\nauthor: Ada\n---\n# Heading"} />);

      expect(screen.getByTestId("markdown-frontmatter")).toBeInTheDocument();
      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("My Doc")).toBeInTheDocument();
      expect(screen.getByText("author")).toBeInTheDocument();
      expect(screen.getByText("Ada")).toBeInTheDocument();
    });

    it("keeps the block out of the rendered body", () => {
      const { container } = render(
        <MarkdownPreview content={"---\ntitle: My Doc\n---\n# Heading"} />,
      );

      const body = container.querySelector(".md-preview")?.textContent ?? "";
      expect(body).toContain("# Heading");
      expect(body).not.toContain("---");
    });

    it("shows no card when there is no frontmatter", () => {
      render(<MarkdownPreview content="# Heading" />);
      expect(screen.queryByTestId("markdown-frontmatter")).not.toBeInTheDocument();
    });

    it("shows no card for a document opening with a thematic break", () => {
      render(<MarkdownPreview content={"---\n\n# Heading"} />);
      expect(screen.queryByTestId("markdown-frontmatter")).not.toBeInTheDocument();
    });
  });

  describe("reading surface", () => {
    it("does not collapse the page before a width has been measured", () => {
      // ResizeObserver is stubbed in setupTests, so width stays 0. Treating
      // that as "narrow" would flash the flush layout on every first paint.
      const { container } = render(<MarkdownPreview content="# Heading" />);

      expect(container.querySelector(".md-doc")).not.toHaveAttribute("data-narrow");
    });
  });

  describe("outline", () => {
    it("stays hidden until the pane reports enough width", () => {
      // ResizeObserver is stubbed in setupTests, so no measurement ever arrives
      // and the rail must default to hidden rather than to shown.
      render(<MarkdownPreview content={"# A\n\n## B\n\n## C\n\n## D"} />);

      expect(screen.queryByTestId("markdown-outline")).not.toBeInTheDocument();
    });
  });
});
