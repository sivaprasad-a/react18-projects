import "./App.css";
import AuthenticateStorage from "./components/AuthenticateStorage";
import { Counter } from "./components/Counter";

function App() {
  return (
    <div className="app">
      <div className="container">
        {/* <Counter /> */}
        <AuthenticateStorage />
      </div>
    </div>
  );
}

export default App;
