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
      <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-md text-center text-gray-400">
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
    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-md overflow-hidden">
      <div className="bg-gray-800 p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200">
          Cross-Platform URL Parsing Comparison
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          See how different platforms interpret the same URL
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                Component
              </th>
              {platforms.map((platform) => (
                <th
                  key={platform}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700"
                >
                  {platform}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredKeys.map((key) => (
              <tr key={key} className="hover:bg-gray-800/50">
                <td className="px-4 py-2 text-sm font-medium text-gray-300 whitespace-nowrap">
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
                          ? "text-yellow-400 bg-yellow-900/20"
                          : "text-gray-300"
                      }`}
                    >
                      {value || (
                        <span className="text-gray-500 italic">empty</span>
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
