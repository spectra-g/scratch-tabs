import React from "react";
import { Tablet } from "../types";
import {
  PersonalKanbanColumn,
  PersonalKanbanState,
} from "./types";

const defaultColumns: PersonalKanbanColumn[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const createDefaultState = (): PersonalKanbanState => ({
  type: "personalkanban",
  data: {
    columns: defaultColumns,
  },
});

const isPersonalKanbanState = (
  value: unknown,
): value is PersonalKanbanState => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PersonalKanbanState;
  return (
    candidate.type === "personalkanban" &&
    Array.isArray(candidate.data?.columns) &&
    candidate.data.columns.length === 3
  );
};

export const PersonalKanbanTablet: Tablet = {
  id: "personalkanban",
  label: "Personal Kanban",
  description:
    "A minimal personal board with standard workflow columns for tracking work at a glance.",
  keywords: ["kanban", "board", "tasks", "workflow", "productivity"],

  createInitialState() {
    return createDefaultState();
  },

  serializeState(state) {
    return JSON.stringify(state);
  },

  deserializeState(json) {
    try {
      const parsed = JSON.parse(json);
      return isPersonalKanbanState(parsed) ? parsed : createDefaultState();
    } catch (error) {
      console.error("Failed to deserialize personal kanban state:", error);
      return createDefaultState();
    }
  },

  render(state) {
    return (
      <div
        data-testid="personal-kanban-board"
        className="h-full bg-surface text-main p-4 md:p-6"
      >
        <header className="mb-4 md:mb-6">
          <h1 className="text-xl font-semibold text-main">Personal Kanban</h1>
          <p className="mt-1 text-sm text-muted">
            Capture tasks as they appear and move them across the board.
          </p>
        </header>
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
          {state.data.columns.map((column) => (
            <section
              key={column.id}
              data-testid={`kanban-column-${column.id}`}
              className="rounded-lg border border-base bg-surface-secondary p-4"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-main">
                {column.title}
              </h2>
              <p className="mt-3 text-sm text-muted">No cards yet</p>
            </section>
          ))}
        </div>
      </div>
    );
  },
};

export default PersonalKanbanTablet;
