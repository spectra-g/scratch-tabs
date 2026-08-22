import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CsvFilterPresetsPanel } from "../CsvFilterPresetsPanel";
import { FilterPreset } from "../../hooks/useCsvData";

const presets: FilterPreset[] = [
  {
    id: "p1",
    name: "Big spenders",
    filters: [{ columnId: "col_1", operator: "gt", value: 100 }],
    matchMode: "and",
  },
  {
    id: "p2",
    name: "East or West",
    filters: [
      { columnId: "col_0", operator: "equals", value: "east" },
      { columnId: "col_0", operator: "equals", value: "west" },
    ],
    matchMode: "or",
  },
];

describe("CsvFilterPresetsPanel", () => {
  const renderPanel = (
    overrides: Partial<Parameters<typeof CsvFilterPresetsPanel>[0]> = {},
  ) => {
    const props = {
      presets,
      canSave: true,
      onSave: jest.fn(),
      onApply: jest.fn(),
      onDelete: jest.fn(),
      onClose: jest.fn(),
      ...overrides,
    };
    render(<CsvFilterPresetsPanel {...props} />);
    return props;
  };

  it("lists each preset with its filter count and match mode", () => {
    renderPanel();

    expect(screen.getByTestId("filter-presets-panel")).toBeInTheDocument();
    expect(screen.getByTestId("preset-row-Big spenders")).toHaveTextContent(
      "1 filter • AND",
    );
    expect(screen.getByTestId("preset-row-East or West")).toHaveTextContent(
      "2 filters • OR",
    );
  });

  it("saves the current filters under a typed name and clears the input", () => {
    const props = renderPanel({ canSave: true });

    fireEvent.change(screen.getByTestId("preset-name-input"), {
      target: { value: "My preset" },
    });
    fireEvent.click(screen.getByTestId("save-preset-button"));

    expect(props.onSave).toHaveBeenCalledWith("My preset");
    expect(screen.getByTestId("preset-name-input")).toHaveValue("");
  });

  it("also saves on Enter", () => {
    const props = renderPanel();

    const input = screen.getByTestId("preset-name-input");
    fireEvent.change(input, { target: { value: "Enter preset" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(props.onSave).toHaveBeenCalledWith("Enter preset");
  });

  it("does not save blank names", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByTestId("save-preset-button"));
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("disables saving when there is no active filter set", () => {
    const props = renderPanel({ canSave: false });

    expect(screen.getByTestId("preset-name-input")).toBeDisabled();
    expect(screen.getByTestId("save-preset-button")).toBeDisabled();
    fireEvent.click(screen.getByTestId("save-preset-button"));
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("applies a preset via its Apply button", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByTestId("apply-preset-Big spenders"));
    expect(props.onApply).toHaveBeenCalledWith("p1");
  });

  it("deletes a preset via its delete button", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByTestId("delete-preset-East or West"));
    expect(props.onDelete).toHaveBeenCalledWith("p2");
  });

  it("closes the panel", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByTestId("close-presets-panel"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state without presets", () => {
    renderPanel({ presets: [] });

    expect(
      screen.getByText("No saved filter sets yet."),
    ).toBeInTheDocument();
  });
});
