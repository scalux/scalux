# Scalux

**Build robust and scalable React‑Redux applications**

## Getting Started

Install with npm or yarn:

```bash
npm install scalux
```

## Try it on Stackblitz

[My Scalux Todo List](https://stackblitz.com/edit/vitejs-vite-jxhu6bnj?file=src%2Fmain.tsx)

## Documentation

Full documentation is available at [scalux.github.io/scalux-docs](https://scalux.github.io/scalux-docs/)

## Quick Counter Example

Create a fully functional counter application in just a few lines:

```tsx
// src/app.tsx
import { State } from "scalux";

const { Component, register } = State({ count: 0 });

const CounterComponent = Component({
  domain: "Counter",
  render: ({ value, increment, decrement }) => (
    <div>
      <button onClick={increment}>+</button>
      <span>{value}</span>
      <button onClick={decrement}>-</button>
    </div>
  ),
  data: (state) => ({ value: state.count }),
  handlers: {
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
  },
});

const { reducer } = register();
export { CounterComponent, reducer };
```

### Integrate with Redux Store

```tsx
// src/store.ts
import { configureStore } from "scalux";
import { reducer } from "./app";

export const store = configureStore({ reducer });
```

### Use in React Application

```tsx
// src/main.tsx
import ReactDOM from "react-dom/client";
import { Provider } from "scalux";
import { CounterComponent } from "./app";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <CounterComponent />
  </Provider>
);
```

## Advanced Features 🛠️

- **Undo/Redo History**: Easily enable state history management with `Undoable`.
- **Finite State Machines**: Clearly manage complex states using built-in finite automata.
- **Label and Icon Management**: Centralized multilingual support and theme-aware icons built-in.
- **Logic Abstraction**: Separate business logic clearly from components.
