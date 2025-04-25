import React, { useEffect } from "react";
import type { TodoListComponentProps } from "./types"; // Importe le type des props

/** Composant React pur pour afficher la liste de Todos */
export const TodoListComponentDisplay: React.FC<TodoListComponentProps> = ({
  // Déstructuration des props pour un accès facile
  todos,
  newItemText,
  isLoading,
  error,
  canUndo,
  canRedo,
  fetchTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
  setNewItemText,
  undoAction,
  redoAction,
}) => {
  // Effet pour charger les todos au montage initial du composant
  useEffect(() => {
    fetchTodos();
    // fetchTodos est stable car généré par scalux/Updater, pas besoin de le lister
    // comme dépendance si on utilise les règles d'ESLint pour les hooks,
    // mais l'inclure est plus sûr si on n'est pas certain.
  }, [fetchTodos]);

  /** Gère la soumission du formulaire d'ajout */
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page
    if (newItemText.trim()) {
      addTodo(newItemText.trim()); // Appelle le handler fourni en prop
      // Le champ est vidé par le reducer associé à addTodo
    }
  };

  return (
    <div style={{ padding: "0 2.5em" }}>
      <h1>Ma Todo List avec `scalux`</h1>

      {/* Boutons Undo/Redo */}
      <div>
        <button onClick={undoAction} disabled={!canUndo || isLoading}>
          Undo (Précédent)
        </button>
        <button onClick={redoAction} disabled={!canRedo || isLoading}>
          Redo (Suivant)
        </button>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleAdd} style={{ margin: "1em 0" }}>
        <input
          type="text"
          placeholder="Nouvelle tâche..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)} // Met à jour l'état via le handler
          disabled={isLoading} // Désactivé pendant le chargement
          aria-label="Nouvelle tâche"
        />
        <button type="submit" disabled={isLoading || !newItemText.trim()}>
          Ajouter
        </button>
      </form>

      {/* Indicateur de chargement */}
      {isLoading && <p>Chargement des todos...</p>}

      {/* Affichage d'erreur */}
      {error && <p style={{ color: "red" }}>Erreur: {error}</p>}

      {/* Liste des todos */}
      {!isLoading && !error && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {todos.map((todo) => (
            <li
              key={todo.id}
              style={{
                /* styles pour la lisibilité */ display: "flex",
                alignItems: "center",
                margin: "0.5em 0",
                textDecoration: todo.done ? "line-through" : "none",
                opacity: todo.done ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)} // Appelle le handler
                style={{ marginRight: "0.5em" }}
                aria-label={`Marquer ${todo.label} comme ${
                  todo.done ? "non fait" : "fait"
                }`}
              />
              <span style={{ flexGrow: 1 }}>{todo.label}</span>
              <button
                onClick={() => deleteTodo(todo.id)} // Appelle le handler
                aria-label={`Supprimer ${todo.label}`}
                style={{ marginLeft: "0.5em" }}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Message si la liste est vide */}
      {!isLoading && !error && todos.length === 0 && (
        <p>Aucune tâche pour le moment !</p>
      )}
    </div>
  );
};
