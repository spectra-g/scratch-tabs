import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { highlightSearchTerm } from "../searchHighlight";

describe("highlightSearchTerm", () => {
  it("should return plain text when no query is provided", () => {
    const result = highlightSearchTerm("Hello World", "");
    expect(result).toBe("Hello World");
  });

  it("should return plain text when query is whitespace only", () => {
    const result = highlightSearchTerm("Hello World", "   ");
    expect(result).toBe("Hello World");
  });

  it("should return plain text when text is empty", () => {
    const result = highlightSearchTerm("", "test");
    expect(result).toBe("");
  });

  it("should highlight single match", () => {
    const result = highlightSearchTerm("Hello World", "World");
    const { container } = render(<div>{result}</div>);

    expect(container.querySelector("mark")).toBeInTheDocument();
    expect(container.querySelector("mark")).toHaveTextContent("World");
    expect(container.querySelector("mark")).toHaveClass("bg-warning", "text-gray-900", "px-0.5", "rounded");
  });

  it("should highlight multiple matches case-insensitively", () => {
    const result = highlightSearchTerm("Hello hello HELLO", "hello");
    const { container } = render(<div>{result}</div>);

    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(3);
    expect(marks[0]).toHaveTextContent("Hello");
    expect(marks[1]).toHaveTextContent("hello");
    expect(marks[2]).toHaveTextContent("HELLO");
  });

  it("should handle special regex characters in query", () => {
    const result = highlightSearchTerm("Test (with) special chars", "(with)");
    const { container } = render(<div>{result}</div>);

    const mark = container.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent("(with)");
  });

  it("should preserve text around highlights", () => {
    const result = highlightSearchTerm("Before test after", "test");
    const { container } = render(<div>{result}</div>);

    expect(container.textContent).toBe("Before test after");
    expect(container.querySelector("mark")).toHaveTextContent("test");
  });

  it("should handle partial word matches", () => {
    const result = highlightSearchTerm("testing test tested", "test");
    const { container } = render(<div>{result}</div>);

    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(3);
    expect(marks[0]).toHaveTextContent("test");
    expect(marks[1]).toHaveTextContent("test");
    expect(marks[2]).toHaveTextContent("test");
  });
});