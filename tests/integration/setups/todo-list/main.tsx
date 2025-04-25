import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux"; // Le Provider de react-redux
import { store } from "./store"; // Notre store configuré
import { ConnectedTodoList } from "./state"; // Notre composant connecté final

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Le Provider rend le store Redux disponible à tous les composants connectés */}
    <Provider store={store}>
      <ConnectedTodoList />
    </Provider>
  </React.StrictMode>
);
