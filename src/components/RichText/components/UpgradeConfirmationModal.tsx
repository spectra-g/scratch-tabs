import React, { useEffect, useState } from "react";
import { Code, FileText, ImageIcon, Layers, X } from "../../Icons";

interface UpgradeConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  isCurrentTabEmpty: boolean;
  onPasteAsDataUrl: () => void | Promise<void>;
  onPasteInRichText: () => void | Promise<void>;
  onPasteInCanvas: () => void | Promise<void>;
}

export const UpgradeConfirmationModal: React.FC<UpgradeConfirmationModalProps> = ({
  isOpen,
  onCancel,
  isCurrentTabEmpty,
  onPasteAsDataUrl,
  onPasteInRichText,
  onPasteInCanvas,
}) => {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsWorking(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const runAction = async (action: () => void | Promise<void>) => {
    if (isWorking) return;
    setIsWorking(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The image could not be pasted.",
      );
      setIsWorking(false);
    }
  };

  const options = [
    {
      icon: Code,
      title: isCurrentTabEmpty
        ? "Paste as data URL"
        : "Open data URL in new tab",
      description: isCurrentTabEmpty
        ? "Insert the image's raw data into this tab."
        : "Keep this tab unchanged and open the raw image data in a new plain-text tab.",
      action: onPasteAsDataUrl,
      testId: "paste-image-as-data-url",
    },
    {
      icon: FileText,
      title: "Paste in Rich Text",
      description:
        "Switch this tab to Rich Text and embed the image with the existing content.",
      action: onPasteInRichText,
      testId: "paste-image-in-rich-text",
    },
    {
      icon: Layers,
      title: "Paste in Canvas",
      description: "Create and switch to a new Canvas containing the image.",
      action: onPasteInCanvas,
      testId: "paste-image-in-canvas",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-base bg-surface p-5 shadow-2xl"
        data-testid="rich-text-upgrade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-paste-options-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center">
            <ImageIcon size={24} className="mr-3 text-info" />
            <div>
              <h3
                id="image-paste-options-title"
                className="text-lg font-semibold text-main"
              >
                Paste image
              </h3>
              <p className="mt-1 text-sm text-secondary">
                How would you like to use this image?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="rounded p-1 text-muted transition-colors hover:bg-element-hover hover:text-main disabled:opacity-50"
            aria-label="Close image paste options"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {options.map(({ icon: Icon, title, description, action, testId }) => (
            <button
              key={testId}
              type="button"
              onClick={() => void runAction(action)}
              disabled={isWorking}
              className="flex w-full items-start gap-3 rounded-lg border border-base p-3 text-left transition-colors hover:border-primary/50 hover:bg-element-hover disabled:opacity-50"
              data-testid={testId}
            >
              <Icon size={19} className="mt-0.5 flex-none text-primary" />
              <span>
                <span className="block text-sm font-medium text-main">
                  {title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
