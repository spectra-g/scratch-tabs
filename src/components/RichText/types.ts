export interface RichTextEditorProps {
  tab: Tab;
  onContentChange: (richContent: any) => void;
  onUpgradeToRich?: () => void;
  className?: string;
}

export interface BlockContextMenuProps {
  onBlurContent: () => void;
  onImportCode: () => void;
  position: { x: number; y: number };
  visible: boolean;
}

export interface UpgradeConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface EditorSearchBarProps {
  editor: any; // TipTap editor instance
  isVisible: boolean;
  onClose: () => void;
}

export interface RichTextToolbarProps {
  editor: any; // TipTap editor instance
  activeTab: Tab;
  onImportCode?: () => void;
}

export interface DateCreatedNodeProps {
  dateCreated: number;
}