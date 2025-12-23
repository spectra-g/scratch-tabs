import React from "react";
import { UrlComponents } from "../types";

interface ComparisonViewProps {
  url: string;
  comparisonResults: Record<string, UrlComponents>;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  url,
  comparisonResults,
}) => {
  if (
    !url ||
    !comparisonResults ||
    Object.keys(comparisonResults).length === 0
  ) {
    return (
      <div className="mt-4 p-4 bg-surface-secondary border border-base rounded-md text-center text-secondary">
        Enter a URL to see how it's parsed across different platforms
      </div>
    );
  }

  // Get all platforms
  const platforms = Object.keys(comparisonResults);

  // Get all component keys
  const componentKeys = Object.keys(comparisonResults[platforms[0]]) as Array<
    keyof UrlComponents
  >;

  // Filter out queryParams as it's displayed differently
  const filteredKeys = componentKeys.filter((key) => key !== "queryParams");

  return (
    <div className="mt-4 bg-surface-secondary border border-base rounded-md overflow-hidden">
      <div className="bg-surface-raised p-3 border-b border-base">
        <h3 className="text-sm font-medium text-main">
          Cross-Platform URL Parsing Comparison
        </h3>
        <p className="text-xs text-secondary mt-1">
          See how different platforms interpret the same URL
        </p>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-raised">
              <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider border-b border-base">
                Component
              </th>
              {platforms.map((platform) => (
                <th
                  key={platform}
                  className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider border-b border-base"
                >
                  {platform}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {filteredKeys.map((key) => (
              <tr key={key} className="hover:bg-element-hover">
                <td className="px-4 py-2 text-sm font-medium text-main whitespace-nowrap">
                  {key}
                </td>
                {platforms.map((platform) => {
                  const value = comparisonResults[platform][key];
                  const isDifferent = platforms.some(
                    (p) =>
                      p !== platform && comparisonResults[p][key] !== value,
                  );

                  return (
                    <td
                      key={platform}
                      className={`px-4 py-2 text-sm font-mono ${
                        isDifferent
                          ? "text-warning bg-warning-subtle"
                          : "text-main"
                      }`}
                    >
                      {value || (
                        <span className="text-muted italic">empty</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
