import type { Tab } from "../../../types";
import { parseImageDataUri, imageMimeTypeToExtension } from "../../../formats/image/utils/dataUri";
import type { CanvasNormalizedInput } from "./clipboardClassification";

export type CanvasSendSource =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "image-data-uri";
      dataUri: string;
      fileName: string;
    };

const decodeBase64 = (base64: string): Uint8Array => {
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
};

export const createCanvasSendSourceFromTab = (
  tab: Pick<Tab, "content" | "title">,
  liveContent?: string,
): CanvasSendSource | null => {
  const content = liveContent ?? tab.content ?? "";
  if (!content) return null;

  const image = parseImageDataUri(content);
  if (image) {
    return {
      kind: "image-data-uri",
      dataUri: content,
      fileName: `${tab.title || "Image"}.${imageMimeTypeToExtension(image.mimeType)}`,
    };
  }
  return { kind: "text", text: content };
};

export const canvasSendSourceToInputs = (
  source: CanvasSendSource,
): CanvasNormalizedInput[] => {
  if (source.kind === "text") {
    return source.text ? [{ kind: "text", text: source.text }] : [];
  }

  const parsed = parseImageDataUri(source.dataUri);
  if (!parsed) {
    throw new Error("The image is not a supported data URI.");
  }
  return [
    {
      kind: "file",
      file: new File([decodeBase64(parsed.base64)], source.fileName, {
        type: parsed.mimeType,
      }),
    },
  ];
};
