import { GraphQLSchema } from "./utils/graphqlUtils";

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface GraphQLQueryHistoryItem {
  id: string;
  timestamp: number;
  name?: string;
  query: string;
  variables: string;
  headers: KeyValuePair[];
  isPinned: boolean;
}

export interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string; locations?: any[]; path?: any[] }>;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
}

export interface SubscriptionMessage {
  id: string;
  timestamp: number;
  type: "next" | "error" | "complete";
  data?: any;
  errors?: Array<{ message: string }>;
}

export interface GraphQLTabletState {
  endpoint: string;
  query: string;
  variables: string;
  headers: KeyValuePair[];
  response: GraphQLResponse | null;
  isExecuting: boolean;
  error: string | null;
  schema: GraphQLSchema | null;
  schemaError: string | null;
  isLoadingSchema: boolean;
  history: GraphQLQueryHistoryItem[];
  activeTab: "query" | "variables" | "headers";
  selectedOperation: string | null;
  // Subscription state
  isSubscriptionActive: boolean;
  subscriptionMessages: SubscriptionMessage[];
  subscriptionError: string | null;
  // UI state
  leftPanelWidth: number;
  middlePanelWidth: number;
  showHistory: boolean;
  selectedTypeInSchema: string | null;
}
