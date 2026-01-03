import { Plus, ClipboardPlus, Puzzle } from "../Icons";
import { useRootStore } from "../../stores";

interface TabActionsProps {
  side?: "left" | "right";
  onShowTabletSelector: () => void;
  tabletButtonRef?: React.RefObject<HTMLButtonElement>;
  newTabButtonRef?: React.RefObject<HTMLButtonElement>;
}

export const TabActions: React.FC<TabActionsProps> = ({
  side = "left",
  onShowTabletSelector,
  tabletButtonRef,
  newTabButtonRef,
}) => {
  const { handleNewTab, handleNewTabFromPaste } = useRootStore();

  return (
    <div className="flex items-center">
      <button
        ref={newTabButtonRef}
        onClick={() => handleNewTab(side === "right")}
        className="px-2 py-1 text-main flex items-center h-8"
        title="New tab"
        data-testid="icon-new-tab"
        data-side={side}
      >
        <Plus size={16} />
      </button>
      <button
        onClick={() => handleNewTabFromPaste(side === "right")}
        className="px-2 py-1 text-main flex items-center h-8"
        title="New tab with contents from clipboard"
        data-testid="icon-new-tab-from-clipboard"
        data-side={side}
      >
        <ClipboardPlus size={16} />
      </button>
      <button
        ref={tabletButtonRef}
        onClick={onShowTabletSelector}
        className="px-2 py-1 text-main flex items-center h-8"
        title="Open tool selector (/)"
        data-testid="icon-new-tools"
        data-side={side}
      >
        <Puzzle size={16} />
      </button>
    </div>
  );
};
