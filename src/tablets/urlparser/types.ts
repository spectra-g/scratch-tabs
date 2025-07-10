export interface UrlComponents {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
  queryParams: Record<string, string>;
}

export interface UrlWarning {
  type: "error" | "warning";
  component: keyof UrlComponents | "full";
  message: string;
  description: string;
  suggestion?: string;
}

export interface UrlParserState {
  type: "urlparser";
  data: {
    url: string;
    components: UrlComponents;
    warnings: UrlWarning[];
    history: string[];
    viewMode: "decoded" | "encoded";
    comparisonMode: boolean;
    comparisonResults?: Record<string, UrlComponents>;
  };
}
