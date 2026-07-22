import { render, screen } from "@testing-library/react";
import { HighlightedCode } from "../nodes/HighlightedCode";

describe("HighlightedCode", () => {
  it("renders untrusted source as escaped text without creating elements", () => {
    const source = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <HighlightedCode source={source} language="html" wrap={false} />,
    );

    expect(screen.getByTestId("canvas-code-preview")).toHaveTextContent(source);
    expect(container.querySelector("img")).toBeNull();
  });

  it("exposes wrapping state without mounting an editor", () => {
    render(<HighlightedCode source="const x = 1;" language="javascript" wrap />);

    expect(screen.getByTestId("canvas-code-preview")).toHaveAttribute(
      "data-wrap",
      "true",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
