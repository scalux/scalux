import { State, Slice, Undoable } from "../../../../src"; // Imports principaux de scalux
import { fetchTodosApi, addTodoApi } from "./api"; // Notre API simulée
import type { Todo, TodoDict, TodoListComponentDataProps } from "./types"; // Nos types partagés
import { TodoListComponentDisplay } from "./TodoListComponent"; // Notre composant UI

// ---- 1. Définition de la Structure de l'État ----

// On utilise `Slice` pour découper l'état en domaines logiques.
// Slice pour les données métier (todos, texte d'ajout).
// On l'enveloppe dans `Undoable` pour activer l'historique (undo/redo).
const dataSlice = Slice(
  Undoable({
    todos: {} as TodoDict, // Stockage en dictionnaire { id: Todo }
    newItemText: "",
  })
);

// Slice pour l'état de l'UI (chargement, erreurs).
// Pas besoin d'historique ici, donc pas de `Undoable`.
const uiSlice = Slice({
  loading: false,
  error: null as string | null,
});

// ---- 2. Initialisation de `scalux` avec notre État ----
// `State` prend l'état initial (ici, composé de slices) et retourne
// les constructeurs nécessaires (`Component`, `Updater`, etc.).
const {
  Component, // Constructeur pour connecter les composants React
  register, // Fonction pour enregistrer les reducers générés
  Updater, // Constructeur pour définir la logique de mise à jour
  Resolver, // Constructeur pour créer des sélecteurs réutilisables
  selectors, // Ensemble de sélecteurs générés automatiquement
  undo, // Thunk Redux pré-configuré pour l'action "undo"
  redo, // Thunk Redux pré-configuré pour l'action "redo"
} = State({
  // Notre état est composé de deux slices :
  data: dataSlice,
  ui: uiSlice,
});

// ---- 3. Définition des Updaters (Logique de Mise à Jour) ----

// Chaque Updater définit comment une action utilisateur modifie l'état.

/** Met à jour le champ de saisie */
const setNewItemText = Updater((_state, newText: string) => ({
  // Retourne un objet partiel de l'InternalState à mettre à jour.
  // scalux s'occupe de merger cette mise à jour dans l'état.
  // Ici, on cible `state.data.newItemText` (via l'InternalState).
  data: { newItemText: newText },
}));

/** Bascule l'état 'done' d'un todo */
const toggleTodo = Updater((state, todoId: string) => {
  // Le premier argument 'state' représente l'InternalState actuel.
  const currentTodo = selectors.pick.data.todos(state)[todoId];
  if (!currentTodo) return {}; // Ne rien faire si l'ID n'existe pas

  // Met à jour seulement la propriété 'done' du todo concerné.
  return {
    data: {
      // Cible la slice 'data'
      todos: {
        // Cible le dictionnaire 'todos'
        // Clé dynamique pour cibler le bon todo
        [todoId]: { ...currentTodo, done: !currentTodo.done },
      },
    },
  };
});

/** Charge les todos depuis l'API (fonction asynchrone) */
const fetchTodos = Updater(async () => {
  // Les Updaters peuvent être async. scalux gère l'attente.
  try {
    // Dispatch implicite d'un état de chargement (optionnel mais bonne pratique)
    // On retourne directement la mise à jour partielle de l'InternalState.
    // Note: Un Updater async DOIT retourner l'état final à merger.
    // Il ne peut pas retourner plusieurs états intermédiaires directement.
    // Pour cela, il faudrait utiliser un Thunk manuel.
    // Ici, on met l'état loading AVANT l'appel, et on met à jour à la fin.
    // (Alternative: un thunk qui dispatche 'loading', puis 'success'/'error')

    // Appel API (simulé)
    const apiTodos = await fetchTodosApi();

    // Transformation des données API vers notre format interne (dictionnaire)
    const todosDict = apiTodos.reduce((acc, apiTodo) => {
      acc[apiTodo.id] = {
        id: apiTodo.id,
        label: apiTodo.title,
        done: apiTodo.completed,
      };
      return acc;
    }, {} as TodoDict);

    // Retourne la mise à jour finale (données chargées, fin chargement)
    return {
      data: { todos: todosDict }, // Met à jour les todos dans la slice 'data'
      ui: { loading: false, error: null }, // Met à jour la slice 'ui'
    };
  } catch (e: any) {
    // En cas d'erreur API, met à jour la slice 'ui' avec l'erreur
    return {
      ui: { loading: false, error: e.message || "Erreur inconnue" },
    };
  }
  // Note: L'état 'loading: true' doit être géré soit par l'appelant (moins idéal),
  // soit via un thunk manuel, soit en acceptant que l'UI ne montre le loading
  // que pendant la résolution de la promesse de cet Updater.
  // Pour simplifier cet exemple, on ne met pas l'état loading=true ici.
  // Une approche plus robuste utiliserait un thunk ou des actions séparées.
});

/** Ajoute un nouveau Todo (pattern resolve/reducers) */
const addTodo = Updater({
  // 1. 'resolve': Fonction (peut être async) pour pré-traiter la payload.
  // Reçoit (state, payloadDuHandler) et retourne la donnée prête pour les reducers.
  resolve: Resolver(async (_state, label: string) => {
    if (!label.trim()) {
      throw new Error("Le libellé ne peut pas être vide.");
    }
    // Appelle l'API pour créer le todo et/ou obtenir un ID
    const { id } = await addTodoApi(label); // Simulé ici
    const newTodo = { id, label, done: false };
    return newTodo; // Cette valeur sera passée au(x) reducer(s)
  }),
  // 2. 'updates': Objet où les clés sont les noms des slices à modifier.
  // Chaque valeur est une fonction reducer qui reçoit (sliceState, resolvedData).
  // Utilise Immer en coulisses : on peut muter `sliceState` directement.
  updates: {
    data: (dataSliceState, newTodo: Todo) => {
      // `dataSliceState` est un brouillon Immer
      dataSliceState.todos[newTodo.id] = newTodo; // Ajout au dictionnaire
      dataSliceState.newItemText = ""; // Réinitialisation du champ texte
    },
    // On pourrait aussi modifier la slice 'ui' ici si nécessaire
    // ui: (uiSliceState, newTodo) => { /* ... */ }
  },
});

/** Supprime un Todo (pattern resolve/reducers) */
const deleteTodo = Updater({
  // 'resolve' est simple ici: on passe juste l'ID reçu du handler.
  resolve: Resolver((_state, todoId: string) => todoId),
  // 'reducers' est nécessaire car la suppression d'une clé dans un objet
  // est plus facile/propre avec Immer qu'avec un merge partiel.
  updates: {
    data: (dataSliceState, todoIdToRemove: string) => {
      // Mutation directe du brouillon Immer pour supprimer la clé.
      delete dataSliceState.todos[todoIdToRemove];
    },
  },
});

// ---- 4. Connexion du Composant React à l'État `scalux` ----

// Utilisation de `Resolver` pour créer un sélecteur réutilisable et typé.
// Il prend l'état global (RootState) et retourne les DataProps nécessaires à l'UI.
const selectTodoListData = Resolver((state): TodoListComponentDataProps => {
  // Utilisation des `selectors` générés par `scalux` pour un accès simplifié et sûr :
  // - `selectors.pick` accède aux propriétés des slices (gère `.present` si Undoable)
  // - `selectors.rawGrab` accède à l'état brut d'une slice (utile pour `past`, `future`)

  const todosDict = selectors.pick.data.todos(state);
  const newItemText = selectors.pick.data.newItemText(state);
  const isLoading = selectors.pick.ui.loading(state);
  const error = selectors.pick.ui.error(state);

  // Accès à l'état brut de la slice 'data' pour vérifier l'historique
  const dataRawState = selectors.rawGrab.data(state);
  const canUndo = dataRawState.past.length > 0;
  const canRedo = dataRawState.future.length > 0;

  // Transformation du dictionnaire en tableau pour faciliter le map dans React
  const todosArray = Object.values(todosDict);

  return { todos: todosArray, newItemText, isLoading, error, canUndo, canRedo };
});

// Utilisation de `Component` pour créer le composant connecté ("Container")
export const ConnectedTodoList = Component({
  // `domain`: Préfixe unique pour les types d'actions Redux générés (utile pour DevTools)
  domain: "TodoList",
  // `render`: Le composant React de présentation à utiliser
  render: TodoListComponentDisplay,
  // `data`: Le sélecteur qui mappe l'état Redux aux props de données du composant
  data: selectTodoListData,
  // `handlers`: Mappe les props de fonction du composant aux Updaters/Thunks définis plus haut
  handlers: {
    fetchTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    setNewItemText,
    undoAction: undo, // Utilisation directe du thunk 'undo' fourni par scalux
    redoAction: redo, // Utilisation directe du thunk 'redo' fourni par scalux
  },
});

// ---- 5. Enregistrement Final ----
// `register()` doit être appelé APRÈS la définition de tous les `Component`s.
// Il collecte tous les reducers générés implicitement par les `handlers`
// et retourne le reducer racine pour le store Redux.
const { reducer } = register();

// ---- Exports ----
export { reducer }; // Le reducer racine pour configureStore
// ConnectedTodoList est déjà exporté plus haut pour main.tsx
