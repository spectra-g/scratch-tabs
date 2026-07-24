import { Plus } from "../Icons";
import { useRootStore } from "../../stores";
import { NewDocumentMenu } from "./NewDocumentMenu";

interface TabActionsProps {
  side?: "left" | "right";
  onShowTabletSelector: () => void;
  newTabButtonRef?: React.RefObject<HTMLButtonElement>;
}

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
        className="px-2 py-1 text-main flex items-center h-8"
        title="New tab"
        data-testid="icon-new-tab"
        data-side={side}
      >
        <Plus size={16} />
      </button>
      <NewDocumentMenu
        side={side}
        onCreateText={() => handleNewTab(side === "right")}
        onCreateCanvas={() => void handleNewCanvas(side === "right")}
        onCreateFromClipboard={() => void handleNewTabFromPaste(side === "right")}
        onOpenTools={onShowTabletSelector}
      />
    </div>
  );
};
