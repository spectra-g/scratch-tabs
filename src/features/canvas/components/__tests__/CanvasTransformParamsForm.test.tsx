import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasTransformParamsForm } from "../CanvasTransformParamsForm";

describe("CanvasTransformParamsForm", () => {
  it("renders nothing when the operation takes no parameters", () => {
    const { container } = render(
      <CanvasTransformParamsForm parameters={[]} values={{}} onChange={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("edits every parameter type through one callback", () => {
    const onChange = jest.fn();
    render(
      <CanvasTransformParamsForm
        parameters={[
          { name: "text", label: "Text", type: "string", default: "a" },
          { name: "big", label: "Big", type: "textarea", default: "" },
          { name: "num", label: "Num", type: "number", default: 2 },
          { name: "flag", label: "Flag", type: "boolean", default: false },
          {
            name: "mode",
            label: "Mode",
            type: "select",
            options: [
              { value: "x", label: "X" },
              { value: "y", label: "Y" },
            ],
            default: "x",
          },
          {
            name: "tags",
            label: "Tags",
            type: "multiselect",
            options: [
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ],
          },
        ]}
        values={{ text: "a", big: "", num: 2, flag: false, mode: "x", tags: ["a"] }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByTestId("canvas-transform-param-text"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("text", "hello");

    fireEvent.change(screen.getByTestId("canvas-transform-param-num"), {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith("num", 5);

    fireEvent.click(screen.getByTestId("canvas-transform-param-flag"));
    expect(onChange).toHaveBeenCalledWith("flag", true);

    fireEvent.change(screen.getByTestId("canvas-transform-param-mode"), {
      target: { value: "y" },
    });
    expect(onChange).toHaveBeenCalledWith("mode", "y");
  });
});
