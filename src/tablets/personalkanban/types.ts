import { TabletState } from "../types";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
}

export interface KanbanColumn {
  id: "todo" | "in-progress" | "done";
  title: string;
  cards: KanbanCard[];
}

export interface PersonalKanbanTabletState extends TabletState {
  type: "personalkanban";
  data: {
    columns: KanbanColumn[];
  };
}
