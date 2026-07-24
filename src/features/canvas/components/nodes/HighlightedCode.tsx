import { memo, useMemo } from "react";
import { tokenizeCanvasCode } from "../../utils/canvasCode";

interface HighlightedCodeProps {
  source: string;
  language: string;
  wrap: boolean;
}

const HighlightedCodeComponent = ({
  source,
  language,
  wrap,
}: HighlightedCodeProps) => {
  const tokens = useMemo(
    () => tokenizeCanvasCode(source, language),
    [language, source],
  );

  return (
    <pre
      className={`m-0 min-h-full p-3 font-mono text-xs leading-5 text-main ${
        wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
      }`}
      data-testid="canvas-code-preview"
      data-wrap={wrap}
    >
      <code>
        {tokens.map((token, index) => (
          <span
            key={`${index}-${token.kind}`}
            className={`canvas-code-token-${token.kind}`}
            data-code-token={token.kind}
          >
            {token.value}
          </span>
        ))}
      </code>
    </pre>
  );
};

export const HighlightedCode = memo(HighlightedCodeComponent);
