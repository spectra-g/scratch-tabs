import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Base64OutputProps {
  value: string;
  isValid: boolean;
  mode: "encode" | "decode" | "line-by-line";
}

export const Base64Output: React.FC<Base64OutputProps> = ({
  value,
  isValid,
  mode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="relative flex-1 min-h-[200px]">
      <textarea
        ref={textareaRef}
        value={value}
        readOnly
        className={`w-full h-full min-h-[200px] bg-surface border border-base rounded-lg p-3 text-sm text-main focus:outline-none focus:border-focus/50 transition-colors resize-none font-mono ${!isValid && mode === "decode" ? "border-warning/50" : ""
          }`}
        spellCheck={false}
      />

      {/* Invalid Base64 warning */}
      {!isValid && mode === "decode" && value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-3 right-3 left-3 bg-warning text-yellow-900 text-xs p-2 rounded flex items-center"
        >
          <AlertTriangle size={12} className="mr-1.5 flex-shrink-0" />
          <span>
            Warning: Input contains invalid Base64 characters or formatting.
            Decoding may produce unexpected results.
          </span>
        </motion.div>
      )}
    </div>
  );
};
