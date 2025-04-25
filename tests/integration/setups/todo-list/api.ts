// Type de données tel que retourné par l'API (peut différer de notre état interne)
export type ApiTodo = {
  id: string;
  title: string;
  completed: boolean;
};

/** Simule un appel API pour récupérer les todos initiaux */
export const fetchTodosApi = async (): Promise<ApiTodo[]> => {
  console.log("API: Fetching todos...");
  await new Promise((resolve) => setTimeout(resolve, 800)); // Latence simulée

  if (Math.random() > 0.15) {
    // Simule un succès ou une erreur
    console.log("API: Fetch successful");
    const todos: ApiTodo[] = [
      // Sample data... (données d'exemple comme dans les versions précédentes)
      { id: "1", title: "Apprendre scalux", completed: true },
      {
        id: "2",
        title: "Utiliser Updater avec resolve/reducers",
        completed: false,
      },
      { id: "3", title: "Implémenter undo/redo", completed: false },
      { id: "4", title: "Boire un café", completed: true },
      { id: "5", title: "Tester la suppression", completed: false },
    ];
    return todos;
  } else {
    console.error("API: Fetch failed");
    throw new Error("Erreur réseau simulée lors de la récupération des todos.");
  }
};

/** Simule la création d'un todo côté API */
export const addTodoApi = async (label: string): Promise<{ id: string }> => {
  console.log(`API: Adding todo "${label}"...`);
  await new Promise((resolve) => setTimeout(resolve, 300)); // Latence simulée
  const newId = `temp_${Date.now()}`; // Génère un ID simple pour la démo
  console.log(`API: Todo added with temp ID ${newId}`);
  return { id: newId };
};
