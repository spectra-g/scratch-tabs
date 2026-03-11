import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PersonalKanbanTablet } from "../PersonalKanbanTablet";

describe("PersonalKanbanTablet", () => {
  it("creates the expected initial state", () => {
    expect(PersonalKanbanTablet.createInitialState()).toEqual({
      type: "personalkanban",
      data: {
        columns: [
          { id: "todo", title: "To Do" },
          { id: "inprogress", title: "In Progress" },
          { id: "done", title: "Done" },
        ],
      },
    });
  });

  it("serializes and deserializes state", () => {
    const state = PersonalKanbanTablet.createInitialState();

    const serialized = PersonalKanbanTablet.serializeState(state);

    expect(PersonalKanbanTablet.deserializeState(serialized)).toEqual(state);
  });

  it("falls back to initial state for invalid JSON", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(PersonalKanbanTablet.deserializeState("not-json")).toEqual(
      PersonalKanbanTablet.createInitialState(),
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to deserialize personal kanban state:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("renders the three standard columns", () => {
    render(
      PersonalKanbanTablet.render(
        PersonalKanbanTablet.createInitialState(),
        jest.fn(),
      ),
    );

    expect(screen.getByTestId("kanban-column-todo")).toHaveTextContent("To Do");
    expect(screen.getByTestId("kanban-column-inprogress")).toHaveTextContent(
      "In Progress",
    );
    expect(screen.getByTestId("kanban-column-done")).toHaveTextContent("Done");
  });

  it("renders a board shell heading", () => {
    render(
      PersonalKanbanTablet.render(
        PersonalKanbanTablet.createInitialState(),
        jest.fn(),
      ),
    );

    expect(screen.getByTestId("personal-kanban-board")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Personal Kanban" }),
    ).toBeInTheDocument();
  });

  it("renders empty-state guidance for each column", () => {
    render(
      PersonalKanbanTablet.render(
        PersonalKanbanTablet.createInitialState(),
        jest.fn(),
      ),
    );

    expect(screen.getAllByText("No cards yet")).toHaveLength(3);
  });

  it("renders the shell subtitle", () => {
    render(
      PersonalKanbanTablet.render(
        PersonalKanbanTablet.createInitialState(),
        jest.fn(),
      ),
    );

    expect(
      screen.getByText(
        "Capture tasks as they appear and move them across the board.",
      ),
    ).toBeInTheDocument();
  });
});
