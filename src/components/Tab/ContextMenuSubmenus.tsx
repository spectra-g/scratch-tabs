import React from 'react';

import {
  ChevronLeft,
  ChevronRight,
  GitCompare,
  History,
  ClipboardPaste,
  Pin,
  Copy,
  Layers,
  Download,
  XCircle,
  Scissors,
  Square,
  ExternalLink,
  Edit3,
} from '../Icons';

// Submenu Components for Context Menu Organization

interface SubMenuItemProps {
  label: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}

export const SubMenuItem: React.FC<SubMenuItemProps> = ({ label, icon: Icon, onClick, disabled }) => (
  <button
    className="w-full text-left px-3 py-1.5 hover:bg-element-hover flex items-center text-xs text-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    onClick={onClick}
    disabled={disabled}
  >
    {Icon && <Icon size={14} className="mr-2 flex-shrink-0" />}
    <span className="flex-1 truncate">{label}</span>
  </button>
);

// Split Content Submenu
interface SplitMoveSubmenuProps {
  canMoveRight: boolean;
  canMoveLeft: boolean;
  canUnsplit: boolean;
  canDuplicateAndSplit: boolean;
  onMoveRight: () => void;
  onMoveLeft: () => void;
  onUnsplit: () => void;
  onSplitTab: () => void;
  onDuplicateAndSplit: () => void;
}

export const SplitMoveSubmenu: React.FC<SplitMoveSubmenuProps> = ({
  canMoveRight,
  canMoveLeft,
  canUnsplit,
  canDuplicateAndSplit,
  onMoveRight,
  onMoveLeft,
  onUnsplit,
  onSplitTab,
  onDuplicateAndSplit,
}) => (
  <div className="py-1">
    <SubMenuItem label="Split Tab by Content..." icon={Scissors} onClick={onSplitTab} />
    {canDuplicateAndSplit && <SubMenuItem label="Duplicate and Split" icon={Scissors} onClick={onDuplicateAndSplit} />}
    {(canMoveRight || canMoveLeft || canUnsplit) && <div className="border-t border-base my-1"></div>}
    {canMoveRight && <SubMenuItem label="Move to Right Side" icon={ChevronRight} onClick={onMoveRight} />}
    {canMoveLeft && <SubMenuItem label="Move to Left Side" icon={ChevronLeft} onClick={onMoveLeft} />}
    {canUnsplit && <SubMenuItem label="Unsplit" icon={Square} onClick={onUnsplit} />}
  </div>
);

// Compare Submenu
interface CompareSubmenuProps {
  canCompare: boolean;
  canCompareWithPrevious: boolean;
  canCompareFromClipboard: boolean;
  onCompare: () => void;
  onCompareWithPrevious: () => void;
  onCompareFromClipboard: () => void;
}

export const CompareSubmenu: React.FC<CompareSubmenuProps> = ({
  canCompare,
  canCompareWithPrevious,
  canCompareFromClipboard,
  onCompare,
  onCompareWithPrevious,
  onCompareFromClipboard,
}) => (
  <div className="py-1">
    {canCompare && <SubMenuItem label="Compare with Other Side" icon={GitCompare} onClick={onCompare} />}
    {canCompareWithPrevious && <SubMenuItem label="Compare with Previous Tab" icon={History} onClick={onCompareWithPrevious} />}
    {canCompareFromClipboard && <SubMenuItem label="Compare with Clipboard" icon={ClipboardPaste} onClick={onCompareFromClipboard} />}
  </div>
);

// Organize Submenu
interface OrganizeSubmenuProps {
  isPinned: boolean;
  canGroupTypes: boolean;
  canRename: boolean;
  onTogglePin: () => void;
  onGroupTypes: () => void;
  onRename: () => void;
}

export const OrganizeSubmenu: React.FC<OrganizeSubmenuProps> = ({
  isPinned,
  canGroupTypes,
  onTogglePin,
  onGroupTypes,
  onRename,
  canRename,
}) => (
  <div className="py-1">
    <SubMenuItem
      label={isPinned ? "Unpin" : "Pin"}
      icon={Pin}
      onClick={onTogglePin}
    />
    {canRename && <SubMenuItem label="Rename" icon={Edit3} onClick={onRename} />}
    {canGroupTypes && (
      <>
        <div className="border-t border-base my-1"></div>
        <SubMenuItem label="Group Tabs by Type" icon={Layers} onClick={onGroupTypes} />
      </>
    )}
  </div>
);

// Share / Download Submenu
interface ShareDownloadSubmenuProps {
  canShare: boolean;
  canDownload: boolean;
  onShare: () => void;
  onCopyContent: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
}

export const ShareDownloadSubmenu: React.FC<ShareDownloadSubmenuProps> = ({
  canShare,
  canDownload,
  onShare,
  onCopyContent,
  onDownload,
  onDownloadAll,
}) => (
  <div className="py-1">
    {canShare && <SubMenuItem label="Share" icon={ExternalLink} onClick={onShare} />}
    <SubMenuItem label="Copy Content" icon={Copy} onClick={onCopyContent} />
    {(canShare) && <div className="border-t border-base my-1"></div>}
    {canDownload && (
      <>
        <SubMenuItem label="Download Tab" icon={Download} onClick={onDownload} />
        <SubMenuItem label="Download All" icon={Download} onClick={onDownloadAll} />
      </>
    )}
  </div>
);

// Close Submenu
interface CloseSubmenuProps {
  canCloseToLeft: boolean;
  canCloseToRight: boolean;
  canCloseAllExcept: boolean;
  onClose: () => void;
  onCloseAllExcept: () => void;
  onCloseToLeft: () => void;
  onCloseToRight: () => void;
  leftIcon?: React.ComponentType<{ size?: number | string; className?: string }>;
  rightIcon?: React.ComponentType<{ size?: number | string; className?: string }>;
}

export const CloseSubmenu: React.FC<CloseSubmenuProps> = ({
  canCloseToLeft,
  canCloseToRight,
  canCloseAllExcept,
  onClose,
  onCloseAllExcept,
  onCloseToLeft,
  onCloseToRight,
  leftIcon: LeftIcon = ChevronLeft,
  rightIcon: RightIcon = ChevronRight,
}) => (
  <div className="py-1">
    <SubMenuItem label="Close Tab" icon={XCircle} onClick={onClose} />
    {canCloseAllExcept && <SubMenuItem label="Close All Other Tabs" icon={XCircle} onClick={onCloseAllExcept} />}
    {(canCloseToLeft || canCloseToRight) && <div className="border-t border-base my-1"></div>}
    {canCloseToLeft && <SubMenuItem label="Close Tabs to Left" icon={LeftIcon} onClick={onCloseToLeft} />}
    {canCloseToRight && <SubMenuItem label="Close Tabs to Right" icon={RightIcon} onClick={onCloseToRight} />}
  </div>
);
