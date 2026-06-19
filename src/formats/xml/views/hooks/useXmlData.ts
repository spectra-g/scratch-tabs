import { useEffect, useMemo, useState } from "react";
import { parseXmlDocument } from "../../utils/xmlParser";

export function useXmlData(content: string) {
  const [debouncedContent, setDebouncedContent] = useState(content);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(content), 300);
    return () => clearTimeout(timer);
  }, [content]);

  return useMemo(
    () => ({ ...parseXmlDocument(debouncedContent), debouncedContent }),
    [debouncedContent],
  );
}
