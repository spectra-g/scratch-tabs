import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasNodeInteractionContext } from "../nodes/CanvasNodeInteractionContext";
import { LinkNode } from "../nodes/LinkNode";
import { VideoNode } from "../nodes/VideoNode";
import type { CanvasLinkItem, CanvasVideoItem } from "../../types";

jest.mock("@xyflow/react", () => ({
  NodeResizer: () => null,
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

const item: CanvasVideoItem = {
  id: "video-1",
  type: "video",
  x: 0,
  y: 0,
  width: 480,
  height: 300,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  hostname: "www.youtube.com",
  provider: "youtube",
  videoId: "dQw4w9WgXcQ",
};

const interaction = {
  beginEditing: jest.fn(),
  commitText: jest.fn(),
  commitCode: jest.fn(),
  commitImageAlt: jest.fn(),
  formatCode: jest.fn(),
  toggleCodeCollapsed: jest.fn(),
  toggleCodeWrap: jest.fn(),
  openCodeInTab: jest.fn(),
  detachDerived: jest.fn(),
  requestTransform: jest.fn(),
  replaceImage: jest.fn(),
  copyImage: jest.fn(),
  downloadImage: jest.fn(),
  openImageInSmartView: jest.fn(),
  cancelEditing: jest.fn(),
  commitResize: jest.fn(),
  preparePointerSelection: jest.fn(),
  completePointerSelection: jest.fn(),
  syncFocusedItem: jest.fn(),
};

const renderVideo = () =>
  render(
    <CanvasNodeInteractionContext.Provider value={interaction}>
      <VideoNode
        {...({
          id: item.id,
          data: { item, isEditing: true, isFocused: true },
          selected: true,
        } as React.ComponentProps<typeof VideoNode>)}
      />
    </CanvasNodeInteractionContext.Provider>,
  );

describe("Canvas VideoNode", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates an allowlisted iframe only after Play and removes it on Stop", () => {
    renderVideo();

    const actions = screen.getByLabelText("URL actions");
    expect(actions).toHaveClass("shrink-0", "items-center");
    expect(actions).not.toHaveClass("flex-wrap");
    for (const action of screen.getAllByRole("button")) {
      expect(action).toHaveClass("h-8", "w-8");
    }
    expect(screen.queryByTestId("canvas-video-iframe")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("canvas-video-play"));

    const iframe = screen.getByTestId("canvas-video-iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
    expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation",
    );
    expect(iframe).toHaveAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture; fullscreen",
    );
    expect(iframe).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin",
    );

    fireEvent.click(screen.getByTestId("canvas-video-stop"));
    expect(screen.queryByTestId("canvas-video-iframe")).not.toBeInTheDocument();
  });

  it("removes the playing iframe when the card unmounts", () => {
    const view = renderVideo();
    fireEvent.click(screen.getByTestId("canvas-video-play"));
    expect(screen.getByTestId("canvas-video-iframe")).toBeInTheDocument();

    view.unmount();
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
  });
});

describe("Canvas LinkNode", () => {
  it("renders URL content as text rather than HTML", () => {
    const linkItem: CanvasLinkItem = {
      ...item,
      id: "link-1",
      type: "link",
      width: 360,
      height: 180,
      canonicalUrl:
        "https://example.com/?q=<script>window.compromised=true</script>",
      hostname: "example.com",
    };
    const view = render(
      <CanvasNodeInteractionContext.Provider value={interaction}>
        <LinkNode
          {...({
            id: linkItem.id,
            data: { item: linkItem, isEditing: false, isFocused: true },
            selected: true,
          } as React.ComponentProps<typeof LinkNode>)}
        />
      </CanvasNodeInteractionContext.Provider>,
    );

    expect(view.container.querySelector("script")).not.toBeInTheDocument();
    expect(view.container).toHaveTextContent(
      "<script>window.compromised=true</script>",
    );
  });
});
