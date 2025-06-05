export interface StatusItemProps {
  // Add any common props that status items might need
  className?: string;
  content?: string;
}

export interface PopupMenuItem {
  id: string;
  name: string;
  isSeparator?: boolean;
}