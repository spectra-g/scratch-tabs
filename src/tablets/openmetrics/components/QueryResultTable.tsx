import React from "react";
import { QueryResult } from "../types";
import { formatNumber } from "../utils";

interface QueryResultTableProps {
  result: QueryResult;
}

export const QueryResultTable: React.FC<QueryResultTableProps> = ({
  result,
}) => {
  // If there are no results
  if (result.values.length === 0) {
    return (
      <div className="p-4 bg-surface-raised rounded-lg text-center text-muted">
        No results found for this query
      </div>
    );
  }

  // If there's just a single scalar result
  if (
    result.values.length === 1 &&
    Object.keys(result.values[0].labels).length === 0
  ) {
    return (
      <div className="p-6 bg-surface-raised rounded-lg text-center">
        <div className="text-3xl font-semibold text-primary">
          {formatNumber(result.values[0].value)}
        </div>
        <div className="text-sm text-muted mt-2">{result.metric}</div>
      </div>
    );
  }

  // Otherwise, render a table of results
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-raised">
            {result.groupedBy.length > 0 ? (
              <>
                {result.groupedBy.map((label) => (
                  <th
                    key={label}
                    className="px-4 py-2 text-left text-sm font-medium text-secondary border-b border-base"
                  >
                    {label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-sm font-medium text-secondary border-b border-base">
                  Value
                </th>
              </>
            ) : (
              <>
                <th className="px-4 py-2 text-left text-sm font-medium text-secondary border-b border-base">
                  Labels
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-secondary border-b border-base">
                  Value
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {result.values.map((value, index) => (
            <tr key={index} className="hover:bg-surface-raised">
              {result.groupedBy.length > 0 ? (
                <>
                  {result.groupedBy.map((label) => (
                    <td
                      key={label}
                      className="px-4 py-2 text-sm text-secondary border-b border-base"
                    >
                      {value.labels[label] || ""}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-sm text-right text-primary font-mono border-b border-base">
                    {formatNumber(value.value)}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 text-sm text-secondary border-b border-base">
                    {Object.entries(value.labels).length > 0 ? (
                      <div className="font-mono">
                        {"{"}
                        {Object.entries(value.labels).map(
                          ([key, val], i, arr) => (
                            <span key={key}>
                              <span className="text-muted">{key}</span>=
                              <span className="text-primary">"{val}"</span>
                              {i < arr.length - 1 && ", "}
                            </span>
                          ),
                        )}
                        {"}"}
                      </div>
                    ) : (
                      <span className="text-muted italic">no labels</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-primary font-mono border-b border-base">
                    {formatNumber(value.value)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
