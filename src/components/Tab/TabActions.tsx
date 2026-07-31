import { Plus, ClipboardPlus, Layers, Extension } from "../Icons";
import { useRootStore } from "../../stores";

interface TabActionsProps {
  side?: "left" | "right";
  onShowTabletSelector: () => void;
  newTabButtonRef?: React.RefObject<HTMLButtonElement>;
}

const BUTTON_CLASS = "px-2 py-1 text-main flex items-center h-8";

export const TabActions: React.FC<TabActionsProps> = ({
  side = "left",
  onShowTabletSelector,
  newTabButtonRef,
}) => {
  const { handleNewTab, handleNewTabFromPaste, handleNewCanvas } = useRootStore();

  return (
    <div className="flex items-center">
      <button
        ref={newTabButtonRef}
        onClick={() => handleNewTab(side === "right")}
        className={BUTTON_CLASS}
        title="New tab"
        data-testid="icon-new-tab"
        data-side={side}
      >
        <Plus size={16} />
      </button>
      <button
        onClick={() => void handleNewTabFromPaste(side === "right")}
        className={BUTTON_CLASS}
        title="Import from Paste"
        data-testid="icon-new-tab-from-clipboard"
        data-side={side}
      >
        <ClipboardPlus size={16} />
      </button>
      <button
        onClick={() => void handleNewCanvas(side === "right")}
        className={BUTTON_CLASS}
        title="Canvas"
        data-testid="icon-new-canvas"
        data-side={side}
      >
        <Layers size={16} />
      </button>
      <button
        onClick={onShowTabletSelector}
        className={BUTTON_CLASS}
        title="Developer Tool"
        data-testid="icon-new-tools"
        data-side={side}
      >
        <Extension size={16} />
      </button>
    </div>
  );
};
