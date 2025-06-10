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

import type { SortOption, GroupOption } from '../../../constants';

export type { SortOption, GroupOption };

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  isDestructive?: boolean;
} 