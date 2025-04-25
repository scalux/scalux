/** Type de base pour une tâche Todo */
export type Todo = {
  id: string;
  label: string;
  done: boolean;
};

/** Type pour stocker les todos sous forme de dictionnaire { [id]: Todo } */
export type TodoDict = Record<string, Todo>;

// ---- Props pour le Composant React TodoListComponent ----

/** Props contenant les données à afficher */
export type TodoListComponentDataProps = {
  todos: Todo[]; // Les todos sous forme de tableau pour le rendu
  newItemText: string; // Texte dans le champ d'ajout
  isLoading: boolean; // Indicateur de chargement API
  error: string | null; // Message d'erreur API
  canUndo: boolean; // Vrai si l'action 'undo' est possible
  canRedo: boolean; // Vrai si l'action 'redo' est possible
};

/** Props contenant les fonctions (handlers) à appeler par l'UI */
export type TodoListComponentHandlerProps = {
  fetchTodos: () => void;
  addTodo: (label: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setNewItemText: (text: string) => void;
  undoAction: () => void;
  redoAction: () => void;
};

/** Type complet des props pour le composant TodoListComponent */
export type TodoListComponentProps = TodoListComponentDataProps &
  TodoListComponentHandlerProps;
