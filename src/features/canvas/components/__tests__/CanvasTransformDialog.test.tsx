import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { operationRegistry } from "../../../../services/pipeline/OperationRegistry";
import { CanvasTransformDialog } from "../CanvasTransformDialog";

const registerTestOps = () => {
  operationRegistry.register({
    id: "test.upper",
    name: "Upper",
    description: "Uppercase",
    categories: ["Text"],
    parameters: [],
    execute: (input: string) => input.toUpperCase(),
  });
  operationRegistry.register({
    id: "test.prefix",
    name: "Prefix",
    description: "Add a prefix",
    categories: ["Text"],
    parameters: [
      { name: "prefix", label: "Prefix", type: "string", default: ">> " },
      { name: "count", label: "Count", type: "number", default: 1 },
    ],
    execute: (input: string) => input,
  });
};

describe("CanvasTransformDialog", () => {
  beforeAll(registerTestOps);
  afterAll(() => operationRegistry.clear());

  const renderDialog = (onRun = jest.fn().mockResolvedValue("new-id")) => {
    const onClose = jest.fn();
    render(
      <CanvasTransformDialog
        sourceTitle="code"
        onClose={onClose}
        onRun={onRun}
      />,
    );
    return { onRun, onClose };
  };

  it("searches operations and runs the selected one with defaults", async () => {
    const { onRun, onClose } = renderDialog();

    fireEvent.change(screen.getByTestId("canvas-transform-search"), {
      target: { value: "prefix" },
    });
    expect(
      screen.getByTestId("canvas-transform-op-test.prefix"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("canvas-transform-op-test.upper"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("canvas-transform-op-test.prefix"));
    expect(screen.getByTestId("canvas-transform-param-prefix")).toHaveValue(
      ">> ",
    );
    fireEvent.click(screen.getByTestId("canvas-transform-run"));

    await waitFor(() => expect(onRun).toHaveBeenCalledTimes(1));
    expect(onRun).toHaveBeenCalledWith("test.prefix", {
      prefix: ">> ",
      count: 1,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps Run disabled until an operation is selected", () => {
    renderDialog();
    expect(screen.getByTestId("canvas-transform-run")).toBeDisabled();
  });

  it("shows runner errors without closing", async () => {
    const onRun = jest.fn().mockRejectedValue(new Error("bad query"));
    const onClose = jest.fn();
    render(
      <CanvasTransformDialog sourceTitle="code" onClose={onClose} onRun={onRun} />,
    );

    fireEvent.click(screen.getByTestId("canvas-transform-op-test.upper"));
    fireEvent.click(screen.getByTestId("canvas-transform-run"));

    await waitFor(() =>
      expect(screen.getByTestId("canvas-transform-error")).toHaveTextContent(
        "bad query",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
