import React, { useRef, useState } from "react";
import { Upload, Archive } from "../../../components/Icons";

const ACCEPTED_EXTENSIONS =
  ".zip,.jar,.war,.ear,.apk,.ipa,.docx,.xlsx,.pptx,.odt,.odp,.ods,.epub,.cbz,.xpi,.crx";

const ACCEPTED_MIME = [
  "application/zip",
  "application/java-archive",
  "application/vnd.android.package-archive",
  "application/epub+zip",
  "application/octet-stream",
];

const MAX_SIZE = 256 * 1024 * 1024; // 256 MB
const WARN_SIZE = 64 * 1024 * 1024; // 64 MB

interface DropZoneProps {
  onFile: (file: File) => void;
  error?: string | null;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFile, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setSizeWarning(null);
    if (file.size > MAX_SIZE) {
      setSizeWarning(`File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum is 256 MB.`);
      return;
    }
    if (file.size > WARN_SIZE) {
      setSizeWarning(`Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — parsing may take a moment.`);
    }
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      {(sizeWarning || error) && (
        <div
          className={`w-full max-w-sm px-4 py-2 rounded text-sm ${
            error ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"
          }`}
        >
          {error ?? sizeWarning}
        </div>
      )}
      <div
        role="button"
        aria-label="Drop archive file here"
        aria-dropeffect="copy"
        tabIndex={0}
        className={`flex flex-col items-center justify-center w-full max-w-sm border-2 border-dashed rounded-xl p-12 gap-4 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-base hover:border-primary/50 hover:bg-surface-raised/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <Archive size={48} className="text-muted opacity-50" />
        <div className="text-center">
          <p className="text-main font-medium">Drop an archive file here</p>
          <p className="text-secondary text-sm mt-1">
            ZIP, JAR, APK, DOCX, EPUB, and more
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-content text-sm hover:bg-primary/90 transition-colors"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          <Upload size={14} />
          Choose File
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",") + "," + ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};
