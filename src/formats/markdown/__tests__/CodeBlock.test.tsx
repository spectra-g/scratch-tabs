import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Element } from "hast";
import { CodeBlock } from "../components/MarkdownPreview";

const addBackgroundTab = jest.fn();

jest.mock("../../../stores/rootStore", () => ({
  useRootStore: () => ({ addBackgroundTab }),
}));

const mockUseMermaidPreview = jest.fn();

jest.mock("../hooks/useMermaidPreview", () => ({
  useMermaidPreview: (code: string) => mockUseMermaidPreview(code),
}));

/** Mirrors the hast shape react-markdown passes to the `pre` component. */
const preNode = (className: unknown, ...text: string[]) =>
  ({
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: className === undefined ? {} : { className },
        children: text.map((value) => ({ type: "text", value })),
      },
    ],
  }) as unknown as Element;

describe("CodeBlock", () => {
  beforeEach(() => {
    addBackgroundTab.mockClear();
    mockUseMermaidPreview.mockReset();
    mockUseMermaidPreview.mockReturnValue({ svg: null, error: null, isLoading: false });
  });

  it("puts both the copy and open-in-tab actions on the left, language on the right", () => {
    const { container } = render(
      <CodeBlock node={preNode(["language-js"], "const a = 1;")} lineOffset={0}>
        {"const a = 1;"}
      </CodeBlock>,
    );

    const bar = container.querySelector(".md-code-block__bar");
    const actions = bar?.querySelector(".md-code-block__actions");
    expect(actions?.contains(screen.getByTestId("markdown-copy-code"))).toBe(true);
    expect(actions?.contains(screen.getByTestId("markdown-open-code-in-tab"))).toBe(
      true,
    );

    // The actions group precedes the language label in DOM order (left before right).
    const lang = bar?.querySelector(".md-code-block__lang");
    expect(actions?.compareDocumentPosition(lang!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("opens a background tab with the block's content and language", async () => {
    const user = userEvent.setup();
    render(
      <CodeBlock node={preNode(["language-python"], "print(1)")} lineOffset={0}>
        {"print(1)"}
      </CodeBlock>,
    );

    await user.click(screen.getByTestId("markdown-open-code-in-tab"));

    expect(addBackgroundTab).toHaveBeenCalledTimes(1);
    const [tab, toRightSide] = addBackgroundTab.mock.calls[0];
    expect(tab.content).toBe("print(1)");
    expect(tab.language).toBe("python");
    expect(toRightSide).toBe(false);
  });

  it("falls back to plaintext for an unlabelled fence", async () => {
    const user = userEvent.setup();
    render(
      <CodeBlock node={preNode(undefined, "hello")} lineOffset={0}>
        {"hello"}
      </CodeBlock>,
    );

    await user.click(screen.getByTestId("markdown-open-code-in-tab"));

    const [tab] = addBackgroundTab.mock.calls[0];
    expect(tab.language).toBe("plaintext");
  });

  describe("mermaid diagrams", () => {
    it("renders the diagram and a source toggle once the SVG is ready", () => {
      mockUseMermaidPreview.mockReturnValue({
        svg: "<svg><text>diagram</text></svg>",
        error: null,
        isLoading: false,
      });

      render(
        <CodeBlock node={preNode(["language-mermaid"], "graph TD; A-->B;")} lineOffset={0}>
          {"graph TD; A-->B;"}
        </CodeBlock>,
      );

      const diagram = screen.getByTestId("markdown-mermaid-diagram");
      expect(diagram.innerHTML).toContain("diagram");
      expect(screen.getByTestId("markdown-mermaid-toggle")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-error")).not.toBeInTheDocument();
    });

    it("toggles between the diagram and raw source", async () => {
      const user = userEvent.setup();
      mockUseMermaidPreview.mockReturnValue({
        svg: "<svg><text>diagram</text></svg>",
        error: null,
        isLoading: false,
      });

      render(
        <CodeBlock node={preNode(["language-mermaid"], "graph TD; A-->B;")} lineOffset={0}>
          {"graph TD; A-->B;"}
        </CodeBlock>,
      );

      await user.click(screen.getByTestId("markdown-mermaid-toggle"));

      expect(screen.queryByTestId("markdown-mermaid-diagram")).not.toBeInTheDocument();
      expect(screen.getByText("graph TD; A-->B;")).toBeInTheDocument();

      await user.click(screen.getByTestId("markdown-mermaid-toggle"));

      expect(screen.getByTestId("markdown-mermaid-diagram")).toBeInTheDocument();
    });

    it("shows a loading indicator while the diagram is rendering", () => {
      mockUseMermaidPreview.mockReturnValue({ svg: null, error: null, isLoading: true });

      render(
        <CodeBlock node={preNode(["language-mermaid"], "graph TD; A-->B;")} lineOffset={0}>
          {"graph TD; A-->B;"}
        </CodeBlock>,
      );

      expect(screen.getByTestId("markdown-mermaid-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-diagram")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-toggle")).not.toBeInTheDocument();
    });

    it("falls back to raw source with an error message on render failure", () => {
      mockUseMermaidPreview.mockReturnValue({
        svg: null,
        error: "Parse error on line 1",
        isLoading: false,
      });

      render(
        <CodeBlock node={preNode(["language-mermaid"], "not a diagram")} lineOffset={0}>
          {"not a diagram"}
        </CodeBlock>,
      );

      expect(screen.getByTestId("markdown-mermaid-error")).toHaveTextContent(
        "Parse error on line 1",
      );
      expect(screen.getByText("not a diagram")).toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-diagram")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-toggle")).not.toBeInTheDocument();
    });

    it("never renders diagram UI for non-mermaid blocks", () => {
      mockUseMermaidPreview.mockReturnValue({
        svg: "<svg><text>diagram</text></svg>",
        error: null,
        isLoading: false,
      });

      render(
        <CodeBlock node={preNode(["language-js"], "const a = 1;")} lineOffset={0}>
          {"const a = 1;"}
        </CodeBlock>,
      );

      expect(screen.queryByTestId("markdown-mermaid-diagram")).not.toBeInTheDocument();
      expect(screen.queryByTestId("markdown-mermaid-toggle")).not.toBeInTheDocument();
    });
  });
});
