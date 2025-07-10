import React from "react";
import { useSearchEngine } from "./useSearchEngine";
import { SearchModalUI } from "./SearchModalUI";

// --- Main Search Modal Component ---
export const SearchModal: React.FC = () => {
  const engine = useSearchEngine();

  return <SearchModalUI engine={engine} />;
};
