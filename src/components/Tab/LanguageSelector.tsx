import React from "react";
import { languageRegistry } from "../../languages";
import { LanguageDetector } from "../../languages/types";

interface LanguageSelectorProps {
  onSelect: (languageId: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onSelect,
}) => {
  // Get all registered languages
  const allLanguages = languageRegistry.getAll();

  // Custom sorting logic
  const sortedLanguages = allLanguages.sort(
    (a: LanguageDetector, b: LanguageDetector) => {
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
  const jsonLang = sortedLanguages.find((lang) => lang.id === "json");
  const mdLang = sortedLanguages.find((lang) => lang.id === "markdown");
  // Filter out JSON and Markdown from the alphabetically sorted list
  const otherLangs = sortedLanguages.filter(
    (lang) => lang.id !== "json" && lang.id !== "markdown",
  );

  // Construct the final ordered list
  const finalOrderedList = [
    ...(jsonLang ? [jsonLang] : []), // Add JSON if found
    ...(mdLang ? [mdLang] : []), // Add Markdown if found
    ...otherLangs, // Add the rest
  ];

  return (
    // Map over the specifically ordered list
    finalOrderedList.map((lang) => (
      <button
        key={lang.id}
        className="w-full text-left px-3 py-1.5 hover:bg-gray-600 text-xs text-gray-200 block" // Added 'block' for potential layout consistency
        onClick={() => onSelect(lang.id)}
        title={`Select ${lang.name}`} // Add a title for usability
      >
        {lang.name}
      </button>
    ))
  );
};
