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
      <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">
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
      <div className="p-6 bg-gray-800 rounded-lg text-center">
        <div className="text-3xl font-semibold text-blue-400">
          {formatNumber(result.values[0].value)}
        </div>
        <div className="text-sm text-gray-400 mt-2">{result.metric}</div>
      </div>
    );
  }

  // Otherwise, render a table of results
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            {result.groupedBy.length > 0 ? (
              <>
                {result.groupedBy.map((label) => (
                  <th
                    key={label}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-700"
                  >
                    {label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-300 border-b border-gray-700">
                  Value
                </th>
              </>
            ) : (
              <>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-700">
                  Labels
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-300 border-b border-gray-700">
                  Value
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {result.values.map((value, index) => (
            <tr key={index} className="hover:bg-gray-800">
              {result.groupedBy.length > 0 ? (
                <>
                  {result.groupedBy.map((label) => (
                    <td
                      key={label}
                      className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700"
                    >
                      {value.labels[label] || ""}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-sm text-right text-blue-400 font-mono border-b border-gray-700">
                    {formatNumber(value.value)}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                    {Object.entries(value.labels).length > 0 ? (
                      <div className="font-mono">
                        {"{"}
                        {Object.entries(value.labels).map(
                          ([key, val], i, arr) => (
                            <span key={key}>
                              <span className="text-gray-400">{key}</span>=
                              <span className="text-blue-400">"{val}"</span>
                              {i < arr.length - 1 && ", "}
                            </span>
                          ),
                        )}
                        {"}"}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">no labels</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-blue-400 font-mono border-b border-gray-700">
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
