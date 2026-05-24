import "./App.css";
import { Counter } from "./components/Counter";

function App() {
  return (
    <div className="app">
      <div className="container">
        <h1>React 18 + TypeScript + Redux Toolkit</h1>
        <Counter />
      </div>
    </div>
  );
}

export default App;
