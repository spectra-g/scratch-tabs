import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ClipboardPlus,
  Extension,
  FileText,
  Layers,
} from "../Icons";

interface NewDocumentMenuProps {
  canvasEnabled: boolean;
  onCreateText: () => void;
  onCreateCanvas: () => void;
  onCreateFromClipboard: () => void;
  onOpenTools: () => void;
  side: "left" | "right";
}

const MENU_WIDTH_PX = 208;
const VIEWPORT_MARGIN_PX = 8;

export const NewDocumentMenu = ({
  canvasEnabled,
  onCreateText,
  onCreateCanvas,
  onCreateFromClipboard,
  onOpenTools,
  side,
}: NewDocumentMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      setPosition({
        left: Math.max(
          VIEWPORT_MARGIN_PX,
          Math.min(bounds.left, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_MARGIN_PX),
        ),
        top: bounds.bottom + 4,
      });
    };
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className="relative flex h-8 items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center px-1 text-main"
        title="More new document options"
        aria-label="Choose document type"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="new-document-menu-trigger"
        data-side={side}
      >
        <ChevronDown size={13} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-command min-w-52 rounded border border-base bg-surface py-1 shadow-xl"
          style={position}
          data-testid="new-document-menu"
        >
          <MenuButton
            label="Text Tab"
            icon={FileText}
            onClick={() => run(onCreateText)}
            testId="new-document-text"
          />
          {canvasEnabled && (
            <MenuButton
              label="Canvas"
              icon={Layers}
              onClick={() => run(onCreateCanvas)}
              testId="icon-new-canvas"
            />
          )}
          <div className="my-1 border-t border-base" />
          <MenuButton
            label="From Clipboard"
            icon={ClipboardPlus}
            onClick={() => run(onCreateFromClipboard)}
            testId="new-document-clipboard"
          />
          <MenuButton
            label="Developer Tool"
            icon={Extension}
            onClick={() => run(onOpenTools)}
            testId="new-document-tool"
          />
        </div>
      , document.body)}
    </div>
  );
};

const MenuButton = ({
  label,
  icon: Icon,
  onClick,
  testId,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  onClick: () => void;
  testId: string;
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-main hover:bg-element-hover"
    data-testid={testId}
  >
    <Icon size={14} className="text-secondary" />
    {label}
  </button>
);
