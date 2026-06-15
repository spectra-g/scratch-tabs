import React from "react";
import { useQuickTransformStore } from "../../stores/quickTransformStore";
import { QuickTransformModal } from "./QuickTransformModal";
import { EditorRange } from "../../types";

interface Props {
  activeTabId: string | null;
  onApply: (content: string, range?: EditorRange | null) => void;
}

export const QuickTransformModalWrapper: React.FC<Props> = ({
  activeTabId,
  onApply,
}) => {
  const { isOpen, position, textContext, closeModal } = useQuickTransformStore();

  if (!isOpen || !textContext || textContext.activeTabId !== activeTabId) {
    return null;
  }

  return (
    <QuickTransformModal
      position={position}
      textContext={textContext}
      onApply={onApply}
      onClose={closeModal}
    />
  );
};
