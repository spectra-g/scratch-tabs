import React from "react";
import { Copy, Check } from "lucide-react";
import { RegexMatch } from "../types";

interface MatchPreviewProps {
  matches: RegexMatch[];
  testString: string;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

const GROUP_COLORS = [
  "bg-primary/20 border-primary/50",
  "bg-green-500/20 border-green-500/50",
  "bg-yellow-500/20 border-yellow-500/50",
  "bg-purple-500/20 border-purple-500/50",
  "bg-pink-500/20 border-pink-500/50",
  "bg-indigo-500/20 border-indigo-500/50",
];

export function MatchPreview({
  matches,
  testString,
  onCopy,
  copiedId,
}: MatchPreviewProps) {
  const highlightMatches = () => {
    if (!testString || matches.length === 0) {
      return (
        <span className="text-muted font-mono text-sm">
          {testString || "No test string provided"}
        </span>
      );
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    matches.forEach((match, matchIndex) => {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`before-${matchIndex}`} className="text-secondary">
            {testString.slice(lastIndex, match.index)}
          </span>,
        );
      }

      // Add the main match with highlighting
      elements.push(
        <span
          key={`match-${matchIndex}`}
          className="bg-orange-500/30 border border-orange-500/50 rounded px-1 font-semibold"
          title={`Match ${matchIndex + 1}: "${match.match}"`}
        >
          {match.match}
        </span>,
      );

      lastIndex = match.index + match.match.length;
    });

    // Add remaining text
    if (lastIndex < testString.length) {
      elements.push(
        <span key="after" className="text-secondary">
          {testString.slice(lastIndex)}
        </span>,
      );
    }

    return (
      <span className="font-mono text-sm leading-relaxed">{elements}</span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden custom-scrollbar">
      <div className="flex items-center justify-between p-3 border-b border-base/50">
        <div className="text-sm font-medium text-secondary">
          Matches ({matches.length})
        </div>
      </div>

      {/* Highlighted Text */}
      <div className="flex-shrink-0 p-3 border-b border-base/50 bg-surface-raised/20">
        <div className="text-xs text-muted mb-2">Highlighted Text:</div>
        <div className="bg-canvas/50 border border-base/50 rounded-md p-3 max-h-32 overflow-y-auto overflow-x-auto custom-scrollbar">
          {highlightMatches()}
        </div>
      </div>

      {/* Match Details */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {matches.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No matches found
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {matches.map((match, index) => (
              <div
                key={index}
                className="bg-surface-raised/30 border border-base/50 rounded-lg p-3 overflow-x-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-main">
                    Match {index + 1}
                  </div>
                  <button
                    onClick={() => onCopy(match.match, `match-${index}`)}
                    className={`p-1 rounded transition-colors ${
                      copiedId === `match-${index}`
                        ? "text-green-400"
                        : "text-muted hover:text-main hover:bg-surface-secondary/50"
                    }`}
                    title="Copy match"
                  >
                    {copiedId === `match-${index}` ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex gap-4">
                    <div className="text-muted">Match:</div>
                    <div className="font-mono text-main bg-canvas/50 px-2 py-1 rounded">
                      "{match.match}"
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="text-muted">Position:</div>
                    <div className="text-secondary">
                      {match.index} - {match.lastIndex - 1}
                    </div>
                  </div>

                  {/* Groups */}
                  {match.groups.length > 0 && (
                    <div className="mt-3">
                      <div className="text-muted mb-2">Capture Groups:</div>
                      <div className="space-y-1">
                        {match.groups.map((group, groupIndex) => (
                          <div
                            key={groupIndex}
                            className={`flex items-center justify-between p-2 rounded border text-xs ${
                              GROUP_COLORS[groupIndex % GROUP_COLORS.length]
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="font-medium">
                                {group.name
                                  ? `${group.name}`
                                  : `Group ${group.index}`}
                                :
                              </div>
                              <div className="font-mono">"{group.match}"</div>
                              <div className="text-muted">
                                [{group.start}-{group.end - 1}]
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                onCopy(
                                  group.match,
                                  `group-${index}-${groupIndex}`,
                                )
                              }
                              className={`p-1 rounded transition-colors ${
                                copiedId === `group-${index}-${groupIndex}`
                                  ? "text-green-400"
                                  : "text-muted hover:text-main hover:bg-surface-secondary/50"
                              }`}
                              title="Copy group"
                            >
                              {copiedId === `group-${index}-${groupIndex}` ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Named Groups */}
                  {Object.keys(match.namedGroups).length > 0 && (
                    <div className="mt-3">
                      <div className="text-muted mb-2">Named Groups:</div>
                      <div className="space-y-1">
                        {Object.entries(match.namedGroups).map(
                          ([name, value], namedIndex) => (
                            <div
                              key={name}
                              className={`flex items-center justify-between p-2 rounded border text-xs ${
                                GROUP_COLORS[namedIndex % GROUP_COLORS.length]
                              }`}
                            >
                              <div className="flex gap-3">
                                <div className="font-medium">{name}:</div>
                                <div className="font-mono">"{value}"</div>
                              </div>
                              <button
                                onClick={() =>
                                  onCopy(value, `named-${index}-${name}`)
                                }
                                className={`p-1 rounded transition-colors ${
                                  copiedId === `named-${index}-${name}`
                                    ? "text-green-400"
                                    : "text-muted hover:text-main hover:bg-surface-secondary/50"
                                }`}
                                title="Copy named group"
                              >
                                {copiedId === `named-${index}-${name}` ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
