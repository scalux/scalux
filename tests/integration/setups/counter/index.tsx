// src/app.tsx
import React from "react";
import { State } from "../../../../src";

// Create the initial state and generate the builders
// The state must be an object (not a primitive value)
const { Component, register } = State({ count: 0 });

// Display component definition
type CounterProps = {
  value: number;
  increment: () => void;
  decrement: () => void;
};

const Counter = ({ value, increment, decrement }: CounterProps) => (
  <div>
    <div>
      <button aria-label="Increment value" onClick={() => increment()}>
        Increment
      </button>
      <span>{value}</span>
      <button aria-label="Decrement value" onClick={() => decrement()}>
        Decrement
      </button>
    </div>
  </div>
);

// Assemble the connected component
const CounterComponent: React.FC = Component({
  domain: "Counter", // Action type prefix (e.g. "Counter/increment")
  render: Counter,
  data: (state) => ({ value: state.count }),
  handlers: {
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
  },
});

// Register the handlers in Redux and generate the reducer.
// register must be called once all components have been defined.
const { reducer } = register();

export { CounterComponent, reducer };
