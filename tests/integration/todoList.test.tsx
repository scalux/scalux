import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "../../src";
import { reducer, ConnectedTodoList } from "./setups/todo-list/state";
import * as api from "./setups/todo-list/api";

// Helper to render component with a fresh store instance
function renderWithStore() {
  const store = configureStore({ reducer });
  return render(
    <Provider store={store}>
      <ConnectedTodoList />
    </Provider>
  );
}

describe("TodoList Integration Tests", () => {
  const sampleTodos = [
    { id: "1", title: "Test the app", completed: false },
    { id: "2", title: "Write tests", completed: true },
  ];

  beforeEach(() => {
    // Mock API calls for determinism
    vi.spyOn(api, "fetchTodosApi").mockResolvedValue(sampleTodos);
    vi.spyOn(api, "addTodoApi").mockImplementation(async (label: string) => ({
      id: `temp_${label}`,
    }));
  });

  it("should fetch and display todos on mount", async () => {
    renderWithStore();

    // Initially, before API resolves, the empty list message should be shown
    expect(
      screen.getByText(/aucune tâche pour le moment/i)
    ).toBeInTheDocument();

    // Wait for todos to be loaded and displayed
    await waitFor(() => {
      expect(
        screen.queryByText(/aucune tâche pour le moment/i)
      ).not.toBeInTheDocument();
    });

    // Verify that each sample todo appears
    expect(screen.getByText("Test the app")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();

    // Completed todo should be struck-through and have reduced opacity
    const completedItem = screen
      .getByLabelText(/marquer Write tests comme non fait/i)
      .closest("li");
    expect(completedItem).toHaveStyle("text-decoration: line-through");
    expect(completedItem).toHaveStyle("opacity: 0.6");
  });

  it("should add a new todo", async () => {
    renderWithStore();

    await waitFor(
      () => screen.queryByText(/aucune tâche pour le moment/i) === null
    );

    const input = screen.getByLabelText(/nouvelle tâche/i);
    const addButton = screen.getByRole("button", { name: /ajouter/i });

    await userEvent.type(input, "New Todo");
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("New Todo")).toBeInTheDocument();
    });

    expect(input).toHaveValue("");
  });

  it("should toggle a todo done state", async () => {
    renderWithStore();
    await waitFor(
      () => screen.queryByText(/aucune tâche pour le moment/i) === null
    );

    const toggleCheckbox = screen.getByLabelText(
      /marquer Test the app comme fait/i
    );
    await userEvent.click(toggleCheckbox);

    const item = screen.getByText("Test the app").closest("li");
    expect(item).toHaveStyle("text-decoration: line-through");
    expect(item).toHaveStyle("opacity: 0.6");
  });

  it("should delete a todo", async () => {
    renderWithStore();
    await waitFor(
      () => screen.queryByText(/aucune tâche pour le moment/i) === null
    );

    const deleteButton = screen.getByLabelText(/supprimer Test the app/i);
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Test the app")).not.toBeInTheDocument();
    });
  });

  it("should undo and redo actions", async () => {
    renderWithStore();
    await waitFor(
      () => screen.queryByText(/aucune tâche pour le moment/i) === null
    );

    const deleteButton = screen.getByLabelText(/supprimer Test the app/i);
    await userEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.queryByText("Test the app")).not.toBeInTheDocument();
    });

    const undoButton = screen.getByRole("button", { name: /undo/i });
    const redoButton = screen.getByRole("button", { name: /redo/i });

    await userEvent.click(undoButton);
    expect(screen.getByText("Test the app")).toBeInTheDocument();

    await userEvent.click(redoButton);
    await waitFor(() => {
      expect(screen.queryByText("Test the app")).not.toBeInTheDocument();
    });
  });
});
