import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { XmlTreeView } from "../components/XmlTreeView";
import { parseXmlDocument } from "../../utils/xmlParser";

const xml = "<library><book><author>Alice</author></book><book><author>Bob</author></book></library>";
const { root } = parseXmlDocument(xml);
// IDs are XPaths: /library[1], /library[1]/book[1], etc.
const libraryId = "/library[1]";
const book1Id = "/library[1]/book[1]";

const defaultProps = {
  root,
  search: "",
  selectedNodeId: "",
  onSelectNode: jest.fn(),
  expandedNodeIds: new Set<string>(),
  onToggleExpand: jest.fn(),
  treeScrollTop: 0,
  onTreeScroll: jest.fn(),
};

describe("XmlTreeView", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the root element but not its children when expandedNodeIds is empty", () => {
    render(<XmlTreeView {...defaultProps} />);

    expect(screen.getByText("library")).toBeInTheDocument();
    expect(screen.queryByText("book")).not.toBeInTheDocument();
  });

  it("shows children when the parent node id is in expandedNodeIds", () => {
    render(<XmlTreeView {...defaultProps} expandedNodeIds={new Set([libraryId])} />);

    expect(screen.getAllByText("book")).toHaveLength(2);
  });

  it("only expands the nodes whose IDs are in the set", () => {
    render(<XmlTreeView {...defaultProps} expandedNodeIds={new Set([libraryId])} />);

    // book nodes are visible but not expanded — author should not be visible
    expect(screen.queryByText("author")).not.toBeInTheDocument();
  });

  it("shows deeply nested nodes when all ancestors are expanded", () => {
    render(
      <XmlTreeView
        {...defaultProps}
        expandedNodeIds={new Set([libraryId, book1Id])}
      />,
    );

    expect(screen.getByText("author")).toBeInTheDocument();
  });

  it("calls onToggleExpand(nodeId, true) when expanding a collapsed node", () => {
    const onToggleExpand = jest.fn();
    render(<XmlTreeView {...defaultProps} onToggleExpand={onToggleExpand} />);

    fireEvent.click(screen.getByTitle("Expand node"));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onToggleExpand).toHaveBeenCalledWith(libraryId, true);
  });

  it("calls onToggleExpand(nodeId, false) when collapsing an expanded node", () => {
    const onToggleExpand = jest.fn();
    render(
      <XmlTreeView
        {...defaultProps}
        expandedNodeIds={new Set([libraryId])}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByTitle("Collapse node"));

    expect(onToggleExpand).toHaveBeenCalledWith(libraryId, false);
  });

  it("force-expands all nodes when search is set, ignoring expandedNodeIds", () => {
    // Empty expandedNodeIds, but search should force everything visible
    render(<XmlTreeView {...defaultProps} search="author" />);

    expect(screen.getAllByText("book")).toHaveLength(2);
    expect(screen.getAllByText("author")).toHaveLength(2);
  });

  it("calls onTreeScroll with the current scrollTop when scrolled", () => {
    const onTreeScroll = jest.fn();
    render(<XmlTreeView {...defaultProps} onTreeScroll={onTreeScroll} />);

    fireEvent.scroll(screen.getByTestId("xml-tree-view"), {
      target: { scrollTop: 200 },
    });

    expect(onTreeScroll).toHaveBeenCalledWith(200);
  });

  it("highlights the selected node", () => {
    render(<XmlTreeView {...defaultProps} expandedNodeIds={new Set([libraryId])} selectedNodeId={book1Id} />);

    const bookButtons = screen.getAllByText("book");
    // The first book's row should have the selected class
    expect(bookButtons[0].closest("div[class*='bg-info']")).toBeInTheDocument();
  });
});
