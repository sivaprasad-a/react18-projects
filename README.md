# React 18 + TypeScript + Redux Toolkit Project

A modern React project template with TypeScript and Redux Toolkit (RTK) for state management.

## 📁 Project Structure

```
src/
├── components/          # React components
│   └── Counter.tsx      # Example counter component
├── store/               # Redux store setup
│   ├── store.ts        # Store configuration
│   └── hooks.ts        # Typed Redux hooks
├── slices/              # Redux Toolkit slices
│   └── counterSlice.ts # Example counter slice
├── App.tsx             # Main App component
├── App.css             # App styles
├── main.tsx            # Entry point
└── index.css           # Global styles

index.html             # HTML template
package.json           # Dependencies and scripts
tsconfig.json          # TypeScript configuration
vite.config.ts         # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ or higher
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Architecture

### Redux Toolkit Setup

This project uses Redux Toolkit (RTK) for simplified Redux development:

- **Store** (`src/store/store.ts`) - Centralized store configuration
- **Slices** (`src/slices/`) - Define reducers and actions together using `createSlice`
- **Hooks** (`src/store/hooks.ts`) - Pre-typed hooks for TypeScript support

### Example: Using the Counter

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { increment, decrement } from '@/slices/counterSlice'

function MyComponent() {
  const count = useAppSelector((state) => state.counter.value)
  const dispatch = useAppDispatch()

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
    </>
  )
}
```

## 🔧 Adding New Features

### Create a New Slice

1. Create `src/slices/myFeatureSlice.ts`:

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MyFeatureState {
  data: string[];
}

const initialState: MyFeatureState = {
  data: [],
};

export const myFeatureSlice = createSlice({
  name: "myFeature",
  initialState,
  reducers: {
    addData: (state, action: PayloadAction<string>) => {
      state.data.push(action.payload);
    },
  },
});

export const { addData } = myFeatureSlice.actions;
export default myFeatureSlice.reducer;
```

2. Register in `src/store/store.ts`:

```typescript
reducer: {
  counter: counterReducer,
  myFeature: myFeatureReducer, // Add here
}
```

## 🛠️ Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Vite** - Build tool
- **ESLint** - Code linting

## 📝 Notes

- TypeScript is configured with strict mode enabled
- Path alias `@/` is available for cleaner imports
- All Redux hooks are pre-typed for TypeScript

## 📚 Resources

- [React Documentation](https://react.dev)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Vite Documentation](https://vitejs.dev)
