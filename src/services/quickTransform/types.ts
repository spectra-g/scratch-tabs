export type QuickTransformItem =
  | { type: "operation"; id: string; name: string; description: string }
  | { type: "pipeline"; id: string; name: string; description: string };

export interface RecentItem {
  type: "operation" | "pipeline";
  id: string;
}
