export interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface Workspace {
  id: string;
  name: string;
  tabCount: number;
  isLoadingCount?: boolean;
}

export type SortOption = 'current' | 'title-asc' | 'title-desc' | 'created-asc' | 'created-desc' | 'modified-asc' | 'modified-desc' | 'language' | 'lines-most' | 'lines-least';
export type GroupOption = 'none' | 'language';

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  isDestructive?: boolean;
} 