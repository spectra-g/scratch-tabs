import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SendToCanvasDialog } from "../SendToCanvasDialog";
import { canvasActionService } from "../../services/CanvasActionService";

jest.mock("../../../../stores/workspaceStore", () => ({
  useWorkspaceStore: (selector: (state: { activeWorkspaceId: string }) => unknown) =>
    selector({ activeWorkspaceId: "workspace-1" }),
}));

jest.mock("../../services/CanvasActionService", () => ({
  canvasActionService: {
    getTargets: jest.fn(() => [{ id: "canvas-1", title: "Architecture" }]),
    send: jest.fn().mockResolvedValue("canvas-1"),
  },
}));

describe("SendToCanvasDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("offers a new Canvas and existing workspace Canvases", () => {
    render(
      <SendToCanvasDialog
        source={{ kind: "text", text: "hello" }}
        side="left"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("send-to-new-canvas")).toBeVisible();
    expect(screen.getByText("Architecture")).toBeVisible();
    expect(canvasActionService.getTargets).toHaveBeenCalledWith("workspace-1");
  });

  it("sends normalized content to the selected Canvas", async () => {
    const onClose = jest.fn();
    render(
      <SendToCanvasDialog
        source={{ kind: "text", text: "hello" }}
        side="right"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText("Architecture"));

    await waitFor(() =>
      expect(canvasActionService.send).toHaveBeenCalledWith(
        "workspace-1",
        [{ kind: "text", text: "hello" }],
        { kind: "existing", tabId: "canvas-1" },
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
