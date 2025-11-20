import React from "react";
import { formatRegistry } from "../../formats";
import { FormatModule } from "../../formats/types";

interface FormatSelectorProps {
  onSelect: (formatId: string) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  onSelect,
}) => {
  // Get all registered formats
  const allFormats = formatRegistry.getAll();

  // Custom sorting logic
  const sortedFormats = allFormats.sort(
    (a: FormatModule, b: FormatModule) => {
      const aIsPriority = a.id === "json" || a.id === "markdown";
      const bIsPriority = b.id === "json" || b.id === "markdown";

      if (aIsPriority && !bIsPriority) {
        return -1; // a comes first
      }
      if (!aIsPriority && bIsPriority) {
        return 1; // b comes first
      }
      // If both are priority or both are not, sort alphabetically by name
      // Ensure names are compared case-insensitively
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0; // Names are equal
    },
  );

  // Specific ordering for JSON and Markdown at the top
  // Find them first
  const jsonFormat = sortedFormats.find((format) => format.id === "json");
  const mdFormat = sortedFormats.find((format) => format.id === "markdown");
  // Filter out JSON and Markdown from the alphabetically sorted list
  const otherFormats = sortedFormats.filter(
    (format) => format.id !== "json" && format.id !== "markdown",
  );

  // Construct the final ordered list
  const finalOrderedList = [
    ...(jsonFormat ? [jsonFormat] : []), // Add JSON if found
    ...(mdFormat ? [mdFormat] : []), // Add Markdown if found
    ...otherFormats, // Add the rest
  ];

  return (
    // Map over the specifically ordered list
    finalOrderedList.map((format) => (
      <button
        key={format.id}
        className="w-full text-left px-3 py-1.5 bg-themed-hover text-xs text-themed block" // Added 'block' for potential layout consistency
        onClick={() => onSelect(format.id)}
        title={`Select ${format.name}`} // Add a title for usability
      >
        {format.name}
      </button>
    ))
  );
};
