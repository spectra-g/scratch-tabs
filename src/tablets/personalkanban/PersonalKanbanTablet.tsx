import React from "react";
import { Tablet, TabletState } from "../types";
import { KanbanColumn, PersonalKanbanTabletState } from "./types";

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "To Do", cards: [] },
  { id: "in-progress", title: "In Progress", cards: [] },
  { id: "done", title: "Done", cards: [] },
];

const createDefaultState = (): PersonalKanbanTabletState => ({
  type: "personalkanban",
  data: {
    columns: DEFAULT_COLUMNS.map((column) => ({ ...column, cards: [...column.cards] })),
  },
});

const PersonalKanbanBoard: React.FC<{ state: PersonalKanbanTabletState }> = ({ state }) => (
  <div
    data-testid="personal-kanban-board"
    className="h-full overflow-auto bg-surface"
  >
    <div className="grid h-full min-h-[24rem] gap-4 p-4 md:grid-cols-3">
      {state.data.columns.map((column) => (
        <section
          key={column.id}
          data-testid={`personal-kanban-column-${column.id}`}
          className="flex min-h-[18rem] flex-col rounded-2xl border border-base bg-surface-secondary/60"
        >
          <header className="border-b border-base px-4 py-3">
            <h2 className="text-sm font-semibold text-main">{column.title}</h2>
          </header>

          <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-6 text-sm text-muted">
            {column.cards.length === 0 ? (
              <>
                <p>No cards yet</p>
                <p>Add a card to get started</p>
              </>
            ) : (
              column.cards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-xl border border-base bg-surface px-3 py-2 text-main"
                >
                  {card.title}
                </article>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export const PersonalKanbanTablet: Tablet = {
  id: "personalkanban",
  label: "Personal Kanban",
  keywords: ["kanban", "board", "tasks", "todo", "productivity"],

  createInitialState(): PersonalKanbanTabletState {
    return createDefaultState();
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): PersonalKanbanTabletState {
    const defaultState = createDefaultState();

    try {
      const parsed = JSON.parse(json);
      if (parsed?.type !== "personalkanban" || !Array.isArray(parsed?.data?.columns)) {
        return defaultState;
      }

      return {
        type: "personalkanban",
        data: {
          columns: parsed.data.columns.map((column: Partial<KanbanColumn>, index: number) => ({
            id: DEFAULT_COLUMNS[index]?.id ?? "todo",
            title: typeof column.title === "string" ? column.title : DEFAULT_COLUMNS[index]?.title ?? "To Do",
            cards: Array.isArray(column.cards) ? column.cards : [],
          })),
        },
      };
    } catch {
      return defaultState;
    }
  },

  render(state: TabletState) {
    return <PersonalKanbanBoard state={state as PersonalKanbanTabletState} />;
  },
};

export default PersonalKanbanTablet;
