import { TabletState } from "../types";

export interface PersonalKanbanColumn {
  id: "todo" | "inprogress" | "done";
  title: "To Do" | "In Progress" | "Done";
}

export interface PersonalKanbanState extends TabletState {
  type: "personalkanban";
  data: {
    columns: PersonalKanbanColumn[];
  };
}
