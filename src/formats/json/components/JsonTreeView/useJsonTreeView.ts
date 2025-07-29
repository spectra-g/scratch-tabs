import { useState } from "react";

export const useJsonTreeView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonString, setJsonString] = useState("");

  const openTreeView = (json: string) => {
    setJsonString(json);
    setIsOpen(true);
  };

  const closeTreeView = () => {
    setIsOpen(false);
    setJsonString("");
  };

  return {
    isOpen,
    jsonString,
    openTreeView,
    closeTreeView,
  };
};
