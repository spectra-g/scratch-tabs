import { create } from "zustand";

interface DiffModalState {
  isOpen: boolean;
  leftTabId: string | null;
  rightTabId: string | null;
  leftContent: string | null;
  rightContent: string | null;
  leftLabel: string | null;
  rightLabel: string | null;
  fromHistory?: boolean;
  onClose?: (updatedContent?: string) => void;
}

interface DiffModalStore extends DiffModalState {
  openDiffModal: (
    leftTabId: string,
    rightTabId: string,
    onClose?: (updatedContent?: string) => void
  ) => void;
  openDiffModalWithContent: (
    leftContent: string,
    rightContent: string,
    leftLabel?: string,
    rightLabel?: string,
    onClose?: (updatedContent?: string) => void
  ) => void;
  closeDiffModal: () => void;
}

export const useDiffModalStore = create<DiffModalStore>((set) => ({
  isOpen: false,
  leftTabId: null,
  rightTabId: null,
  leftContent: null,
  rightContent: null,
  leftLabel: null,
  rightLabel: null,
  fromHistory: false,
  onClose: undefined,

  openDiffModal: (leftTabId, rightTabId, onClose) => {
    set({
      isOpen: true,
      leftTabId,
      rightTabId,
      leftContent: null,
      rightContent: null,
      leftLabel: null,
      rightLabel: null,
      fromHistory: false,
      onClose,
    });
  },

  openDiffModalWithContent: (leftContent, rightContent, leftLabel = "Left", rightLabel = "Right", onClose) => {
    set({
      isOpen: true,
      leftTabId: null,
      rightTabId: null,
      leftContent,
      rightContent,
      leftLabel,
      rightLabel,
      fromHistory: false,
      onClose,
    });
  },

  closeDiffModal: () => {
    const { onClose } = useDiffModalStore.getState();
    if (onClose) {
      onClose();
    }
    set({
      isOpen: false,
      leftTabId: null,
      rightTabId: null,
      leftContent: null,
      rightContent: null,
      leftLabel: null,
      rightLabel: null,
      fromHistory: false,
      onClose: undefined,
    });
  },
}));
