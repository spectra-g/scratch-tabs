export interface Base64Format {
  id: string;
  name: string;
  description: string;
  encode: (input: string) => string;
  decode: (input: string) => string;
  validate: (input: string) => boolean;
}

export interface EncodingOption {
  id: string;
  name: string;
  description: string;
}

export interface Base64Stats {
  originalSize: number;
  encodedSize: number;
  ratio: number;
  compressionPercentage: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  action: "encode" | "decode";
  input: string;
  output: string;
  format: string;
  encoding: string;
}

export interface Base64TabletState {
  type: "base64";
  data: {
    input: string;
    output: string;
    mode: "encode" | "decode" | "line-by-line";
    selectedFormat: string;
    selectedEncoding: string;
    wrapOutput: boolean;
    preserveNewlines: boolean;
    history: HistoryItem[];
    error: string | null;
    isDragging: boolean;
    layout: "horizontal" | "vertical";
  };
}
