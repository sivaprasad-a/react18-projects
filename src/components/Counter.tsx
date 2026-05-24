import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  increment,
  decrement,
  incrementByAmount,
} from "../slices/counterSlice";

export function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <div className="counter-container">
      <h1>Counter</h1>
      <p className="counter-display">{count}</p>
      <div className="button-group">
        <button onClick={() => dispatch(increment())}>Increment</button>
        <button onClick={() => dispatch(decrement())}>Decrement</button>
        <button onClick={() => dispatch(incrementByAmount(5))}>Add 5</button>
      </div>
    </div>
  );
}
