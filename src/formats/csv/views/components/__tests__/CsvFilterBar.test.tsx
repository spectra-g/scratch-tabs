import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CsvFilterBar } from "../CsvFilterBar";
import { ColumnFilter } from "../../utils/filtering";
import { CsvColumn } from "../../types";

const columns: CsvColumn[] = [
  { id: "col_0", name: "Name", type: "text", index: 0 },
  { id: "col_1", name: "Amount", type: "number", index: 1 },
];

const nameFilter: ColumnFilter = {
  columnId: "col_0",
  operator: "contains",
  value: "an",
};

const amountFilter: ColumnFilter = {
  columnId: "col_1",
  operator: "gt",
  value: 100,
};

describe("CsvFilterBar", () => {
  const renderBar = (
    overrides: Partial<Parameters<typeof CsvFilterBar>[0]> = {},
  ) => {
    const props = {
      columns,
      filters: [] as ColumnFilter[],
      matchMode: "and" as const,
      showFilterRow: false,
      visibleRowCount: 10,
      totalRowCount: 10,
      showPresetsPanel: false,
      onToggleFilterRow: jest.fn(),
      onRemoveFilter: jest.fn(),
      onClearFilters: jest.fn(),
      onMatchModeChange: jest.fn(),
      onTogglePresetsPanel: jest.fn(),
      ...overrides,
    };
    render(<CsvFilterBar {...props} />);
    return props;
  };

  it("renders the filters toggle button when there are no filters", () => {
    renderBar();

    expect(screen.getByTestId("toggle-filters-button")).toBeInTheDocument();
    expect(screen.getByTestId("csv-filter-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("clear-filters-button")).not.toBeInTheDocument();
  });

  it("toggles the presets panel", () => {
    const props = renderBar({ showPresetsPanel: false });

    const toggle = screen.getByTestId("toggle-presets-button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(props.onTogglePresetsPanel).toHaveBeenCalledWith(true);
  });

  it("shows the row summary when a filter is active", () => {
    renderBar({
      filters: [nameFilter],
      visibleRowCount: 4,
      totalRowCount: 12,
    });

    expect(screen.getByTestId("filter-summary")).toHaveTextContent(
      "Showing 4 of 12 rows",
    );
  });

  it("shows a chip per filter using column names", () => {
    renderBar({ filters: [nameFilter, amountFilter] });

    expect(screen.getByTestId("filter-chip-col_0")).toHaveTextContent(
      "Name contains an",
    );
    expect(screen.getByTestId("filter-chip-col_1")).toHaveTextContent(
      "Amount > 100",
    );
  });

  it("removes a filter via its chip close button", () => {
    const props = renderBar({ filters: [nameFilter] });

    fireEvent.click(screen.getByTestId(`remove-filter-${nameFilter.columnId}`));
    expect(props.onRemoveFilter).toHaveBeenCalledWith(nameFilter.columnId);
  });

  it("clears all filters", () => {
    const props = renderBar({ filters: [nameFilter] });

    fireEvent.click(screen.getByTestId("clear-filters-button"));
    expect(props.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("hides the match mode control with fewer than two filters", () => {
    renderBar({ filters: [nameFilter] });

    expect(screen.queryByTestId("match-mode-and")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-mode-or")).not.toBeInTheDocument();
  });

  it("switches the match mode", () => {
    const props = renderBar({ filters: [nameFilter, amountFilter], matchMode: "and" });

    fireEvent.click(screen.getByTestId("match-mode-or"));
    expect(props.onMatchModeChange).toHaveBeenCalledWith("or");
  });

  it("reflects the active match mode", () => {
    renderBar({ filters: [nameFilter, amountFilter], matchMode: "or" });

    expect(screen.getByTestId("match-mode-or")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("match-mode-and")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles the filter row visibility", () => {
    const props = renderBar({ showFilterRow: false });

    const toggle = screen.getByTestId("toggle-filters-button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(props.onToggleFilterRow).toHaveBeenCalledWith(true);
  });
});
