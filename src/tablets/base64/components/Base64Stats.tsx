import React from "react";
import { motion } from "framer-motion";
import { BarChart, ArrowUp, ArrowDown } from "lucide-react";
import { Base64Stats as StatsType } from "../types";
import { formatFileSize } from "../utils/base64Utils";

interface Base64StatsProps {
  stats: StatsType | null;
  mode: "encode" | "decode" | "line-by-line";
}

export const Base64Stats: React.FC<Base64StatsProps> = ({ stats, mode }) => {
  if (!stats) return null;

  const isEncoding =
    mode === "encode" || (mode === "line-by-line" && stats.ratio > 1);
  const changePercentage = Math.abs(stats.compressionPercentage).toFixed(1);
  const isIncrease = stats.compressionPercentage > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-surface-secondary border border-base rounded-lg p-2 text-xs"
    >
      <div className="flex items-center space-x-1 mb-1.5 text-secondary">
        <BarChart size={14} />
        <span>Base64 Statistics</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-element rounded p-1.5">
          <div className="text-muted mb-0.5">Original Size</div>
          <div className="text-main font-medium">
            {formatFileSize(stats.originalSize)}
          </div>
        </div>
        <div className="bg-element rounded p-1.5">
          <div className="text-muted mb-0.5">
            {isEncoding ? "Encoded" : "Decoded"} Size
          </div>
          <div className="text-main font-medium">
            {formatFileSize(stats.encodedSize)}
          </div>
        </div>
        <div className="bg-element rounded p-1.5">
          <div className="text-muted mb-0.5">Size Ratio</div>
          <div className="text-main font-medium">
            {stats.ratio.toFixed(2)}x
          </div>
        </div>
        <div className="bg-element rounded p-1.5">
          <div className="text-muted mb-0.5">Size Change</div>
          <div
            className={`font-medium flex items-center ${isIncrease ? "text-warning" : "text-success"}`}
          >
            {isIncrease ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            <span>{changePercentage}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
