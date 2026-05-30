# React Best Practices

A comprehensive guide for writing clean, performant, and maintainable React applications. Covers state management, hooks, component design, TypeScript, performance, and security.

---

## Table of Contents

1. [State & useState](#1-state--usestate)
2. [useEffect](#2-useeffect)
3. [useRef & useReducer](#3-useref--usereducer)
4. [useContext](#4-usecontext)
5. [Rules of Hooks](#5-rules-of-hooks)
6. [Component Design](#6-component-design)
7. [Performance Optimization](#7-performance-optimization)
8. [TypeScript Patterns](#8-typescript-patterns)
9. [Security](#9-security)
10. [Code Review Checklist](#10-code-review-checklist)

---

## 1. State & useState

### Never read state immediately after setting it

State updates are **asynchronous** — the variable in the current render is frozen.

```tsx
// ❌ Wrong — count is still the old value
const handle = () => {
  setCount(count + 1);
  console.log(count); // still 0
};

// ✅ Right — compute next value yourself
const handle = () => {
  const next = count + 1;
  setCount(next);
  console.log(next); // correct
};
```

### Use functional updater when new state depends on old state

```tsx
// ❌ Wrong — stale closure risk
setCount(count + 1);

// ✅ Right — always reads the latest value
setCount(prev => prev + 1);
```

### Group related state into one object

```tsx
// ❌ Wrong — three states, three potential re-renders
const [name, setName] = useState('');
const [age, setAge] = useState(0);
const [email, setEmail] = useState('');

// ✅ Right — one object, one re-render, partial updates with spread
const [form, setForm] = useState({ name: '', age: 0, email: '' });
const updateField = (field: string, value: unknown) =>
  setForm(prev => ({ ...prev, [field]: value }));
```

### Lazy-initialize expensive state

```tsx
// ❌ Wrong — heavyCompute() runs on every render
const [data, setData] = useState(heavyCompute());

// ✅ Right — function runs only once at mount
const [data, setData] = useState(() => heavyCompute());
```

### Don't store derived data in state

```tsx
// ❌ Wrong — count is redundant state
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);

// ✅ Right — compute directly from source of truth
const [items, setItems] = useState([]);
const count = items.length;
```

### Never mutate state directly

```tsx
// ❌ Wrong — same reference, React skips re-render
items.push(newItem);
setItems(items);

// ✅ Right — new reference triggers re-render
setItems(prev => [...prev, newItem]);
```

---

## 2. useEffect

### Always add a dependency array

```tsx
// ❌ Wrong — runs after every single render
useEffect(() => {
  fetchData();
});

// ✅ Right — runs once on mount
useEffect(() => {
  fetchData();
}, []);

// ✅ Right — runs when userId changes
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

### Always clean up subscriptions and timers

```tsx
// ❌ Wrong — timer runs forever after unmount
useEffect(() => {
  const id = setInterval(tick, 1000);
}, []);

// ✅ Right — cleanup on unmount
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

### Don't make the effect callback async directly

```tsx
// ❌ Wrong — async fn returns a Promise, not a cleanup function
useEffect(async () => {
  const data = await fetchData();
  setData(data);
}, []);

// ✅ Right — define async function inside and call it
useEffect(() => {
  const load = async () => {
    const data = await fetchData();
    setData(data);
  };
  load();
}, []);
```

### Cancel fetch requests on cleanup with AbortController

```tsx
useEffect(() => {
  const controller = new AbortController();

  const load = async () => {
    try {
      const res = await fetch('/api/data', { signal: controller.signal });
      const data = await res.json();
      setData(data);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  };

  load();
  return () => controller.abort();
}, []);
```

### Don't use useEffect for event handlers or derived values

```tsx
// ❌ Wrong — effect is not needed for event responses
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Right — derive directly, no effect needed
const fullName = `${firstName} ${lastName}`;
```

---

## 3. useRef & useReducer

### Use useRef for values that don't affect the UI

```tsx
// ❌ Wrong — timer ID stored in state causes needless re-renders
const [timerId, setTimerId] = useState<number | null>(null);

// ✅ Right — ref persists without triggering re-renders
const timerRef = useRef<number | null>(null);
timerRef.current = setInterval(tick, 1000);
```

### Never read ref.current during render

```tsx
// ❌ Wrong — ref.current is null on first render
const len = inputRef.current.value.length; // crashes

// ✅ Right — access refs only in effects or event handlers
const handleClick = () => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
};
```

### Reach for useReducer when state has multiple related fields

```tsx
// ❌ Fragile — easy to forget resetting error or loading
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

// ✅ Right — all transitions are explicit and testable
type State = { loading: boolean; data: User | null; error: string | null };
type Action =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: User }
  | { type: 'ERROR'; error: string };

const reducer = (state: State, action: Action): State => ({
  LOADING: { loading: true,  data: null,           error: null          },
  SUCCESS: { loading: false, data: action.payload,  error: null          }, // action.payload only valid when type is SUCCESS
  ERROR:   { loading: false, data: null,            error: action.error  }, // action.error only valid when type is ERROR
}[action.type] ?? state);

const [state, dispatch] = useReducer(reducer, {
  loading: false, data: null, error: null,
});
```

---

## 4. useContext

### Split contexts by update frequency

```tsx
// ❌ Wrong — one giant context; any change re-renders all consumers
const AppContext = createContext({ theme, user, cart, setCart, setUser });

// ✅ Right — isolated contexts so cart updates don't re-render the navbar
const ThemeContext = createContext<'light' | 'dark'>('light'); // rarely changes
const UserContext  = createContext<User | null>(null);         // on login/logout
const CartContext  = createContext<CartState>(defaultCart);    // frequently changes
```

### Memoize the context value to prevent cascading re-renders

```tsx
// ❌ Wrong — inline object is a new reference every render
<UserContext.Provider value={{ user, setUser }}>

// ✅ Right — stable reference, consumers only re-render when user changes
const value = useMemo(() => ({ user, setUser }), [user]);
<UserContext.Provider value={value}>
```

### Create a custom hook to consume context safely

```tsx
// ✅ Provides a clear error if used outside the provider
const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
};
```

---

## 5. Rules of Hooks

> Hooks must be called at the **top level** of a React function — never inside conditions, loops, or nested functions.

### Never call hooks conditionally

```tsx
// ❌ Wrong — hook order shifts between renders → runtime error
if (isLoggedIn) {
  const [name, setName] = useState('');
}

// ✅ Right — hook at the top, condition inside
const [name, setName] = useState('');
useEffect(() => {
  if (isLoggedIn) fetchName().then(setName);
}, [isLoggedIn]);
```

### Never call hooks inside a loop

```tsx
// ❌ Wrong — call count changes if fields.length changes
fields.forEach(field => {
  const [val, setVal] = useState('');
});

// ✅ Right — one state object, keyed by field ID
const [values, setValues] = useState<Record<string, string>>(
  () => Object.fromEntries(fields.map(f => [f.id, '']))
);
```

### Custom hooks must start with `use`

This enables the ESLint plugin to apply hook rules to them.

```tsx
// ❌ Wrong — linter won't enforce rules of hooks inside this
const getWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  ...
};

// ✅ Right
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};
```

---

## 6. Component Design

### One component, one responsibility

```tsx
// ❌ Wrong — fetch + business logic + UI all in one
const UserPage = () => {
  const [user, setUser] = useState(null);
  useEffect(() => { fetch('/api/user').then(...).then(setUser); }, []);
  const formatted = user?.name.toUpperCase();
  return <div>{formatted}</div>;
};

// ✅ Right — logic in a custom hook, component renders only
const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('/api/user').then(r => r.json()).then(setUser).finally(() => setLoading(false));
  }, []);
  return { user, loading };
};

const UserPage = () => {
  const { user, loading } = useUser();
  if (loading) return <Spinner />;
  return <div>{user?.name.toUpperCase()}</div>;
};
```

### Always handle all four data states

```tsx
// ❌ Wrong — crashes on null, shows blank on empty
const UserList = ({ users }) => (
  <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
);

// ✅ Right — all four states handled
const UserList = ({ users, loading, error }: Props) => {
  if (loading)        return <Spinner />;
  if (error)          return <ErrorMessage message={error} />;
  if (!users?.length) return <EmptyState />;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```

### Avoid prop drilling deeper than 2–3 levels

```tsx
// ❌ Wrong — passing theme through every layer
<Layout theme={theme}>
  <Sidebar theme={theme}>
    <NavItem theme={theme} />
  </Sidebar>
</Layout>

// ✅ Right — context or a state manager
const theme = useContext(ThemeContext);
```

### Wrap trees in Error Boundaries

```tsx
// Prevents one crash from taking down the whole app
<ErrorBoundary fallback={<ErrorPage />}>
  <FeatureSection />
</ErrorBoundary>
```

---

## 7. Performance Optimization

### Use stable keys in lists — never index

```tsx
// ❌ Wrong — reordering/deletion corrupts DOM reuse
{items.map((item, index) => <Row key={index} item={item} />)}

// ✅ Right — stable unique ID from data
{items.map(item => <Row key={item.id} item={item} />)}
```

### Avoid inline objects and functions in JSX

```tsx
// ❌ Wrong — new reference every render, React.memo is useless
<Child style={{ color: 'red' }} onClick={() => doSomething()} />

// ✅ Right — stable references
const STYLE = { color: 'red' } as const;
const handleClick = useCallback(() => doSomething(), []);
<Child style={STYLE} onClick={handleClick} />
```

### Memoize expensive calculations

```tsx
// ❌ Wrong — recalculates on every render
const sorted = items.sort((a, b) => a.price - b.price);

// ✅ Right — recalculates only when items change
const sorted = useMemo(
  () => [...items].sort((a, b) => a.price - b.price),
  [items]
);
```

### Code-split at the route level

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings  = lazy(() => import('./pages/Settings'));

<Suspense fallback={<PageSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings"  element={<Settings />} />
  </Routes>
</Suspense>
```

### Virtualize long lists

```tsx
// For lists with 100+ items, use react-window or @tanstack/virtual
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={items.length} itemSize={50} width="100%">
  {({ index, style }) => <Row style={style} item={items[index]} />}
</FixedSizeList>
```

> **Rule of thumb:** Profile with React DevTools before adding `useMemo`/`useCallback`. Only optimize what you can measure.

---

## 8. TypeScript Patterns

### Type all component props explicitly

```tsx
// ❌ Wrong — no type safety
const Button = ({ label, onClick }) => ...

// ✅ Right — typed props with optional fields marked
interface ButtonProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}
const Button = ({ label, onClick, variant = 'primary', disabled }: ButtonProps) => ...
```

### Type all event handlers

```tsx
// ❌ Wrong — e is implicitly any
<input onChange={(e) => setValue(e.target.value)} />

// ✅ Right — full type safety and autocomplete
<input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} />
```

### Never use `any` — use `unknown` and narrow

```tsx
// ❌ Wrong — bypasses all type checking
const process = (data: any) => console.log(data.nmae);

// ✅ Right — type narrowing is safe and explicit
const process = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    console.log((data as { name: string }).name);
  }
};
```

### Type API responses with interfaces

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUser = async (id: number): Promise<User> => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json() as Promise<User>;
};
```

### Use utility types to reduce repetition

```tsx
// Partial — all fields optional (useful for update payloads)
const updateUser = (id: number, changes: Partial<User>) => ...

// Pick — select specific fields
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit — exclude specific fields
type CreateUserPayload = Omit<User, 'id'>;

// ReturnType — infer return type from a function
type UseUserReturn = ReturnType<typeof useUser>;
```

---

## 9. Security

### Always sanitize HTML before rendering

```tsx
import DOMPurify from 'dompurify';

// ❌ Wrong — direct XSS vector
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Right — sanitized before render
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// ✅ Better — use a markdown renderer instead
import ReactMarkdown from 'react-markdown';
<ReactMarkdown>{markdownContent}</ReactMarkdown>
```

### Never hardcode secrets in component files

```tsx
// ❌ Wrong — visible in browser bundle and git history
const API_KEY = 'sk_live_abc123';

// ✅ Right — environment variable (add .env to .gitignore)
// In .env:  REACT_APP_API_KEY=sk_live_abc123
const apiKey = process.env.REACT_APP_API_KEY;

// ✅ Best — proxy sensitive calls through your own backend
// so the key never reaches the client at all
```

### Validate and sanitize all user input

```tsx
// ❌ Wrong — trusts user-supplied URL
<a href={userUrl}>Link</a>

// ✅ Right — only allow safe protocols
const isSafeUrl = (url: string) => /^https?:\/\//.test(url);
{isSafeUrl(userUrl) && <a href={userUrl}>Link</a>}
```

---

## 10. Code Review Checklist

Use this checklist when reviewing a pull request or before submitting one.

### State & hooks
- [ ] No state read immediately after `setState`
- [ ] Functional updater used when new state depends on old state
- [ ] No direct state mutation (`push`, `splice`, property assignment)
- [ ] No derived data stored in state
- [ ] No expensive value passed directly to `useState()` — lazy init used
- [ ] All hooks called unconditionally at the top level

### useEffect
- [ ] Dependency array present on every `useEffect`
- [ ] All variables referenced inside the effect are in the deps array
- [ ] Subscriptions, timers, and listeners cleaned up with a return function
- [ ] No async callback passed directly — inner async function used instead
- [ ] Fetch requests cancelled with `AbortController` on cleanup

### Component design
- [ ] Component does one thing (no god components)
- [ ] Data fetching extracted to a custom hook
- [ ] All four states handled: loading, error, empty, data
- [ ] No prop drilling deeper than 2–3 levels
- [ ] Error boundaries wrapping critical subtrees

### Performance
- [ ] Stable unique IDs used as list keys (no index)
- [ ] No inline objects or arrow functions in JSX props passed to memoized children
- [ ] `useMemo` / `useCallback` only where profiling shows a need
- [ ] Routes code-split with `React.lazy` + `Suspense`
- [ ] Long lists virtualized

### TypeScript
- [ ] No `any` — `unknown` with narrowing used instead
- [ ] All props typed with interfaces
- [ ] All event handlers typed (`React.ChangeEvent<HTMLInputElement>` etc.)
- [ ] API response types defined

### Security
- [ ] No `dangerouslySetInnerHTML` without `DOMPurify.sanitize`
- [ ] No secrets hardcoded — environment variables used
- [ ] User-supplied URLs validated before rendering in `href`

---

## Recommended tooling

| Tool | Purpose |
|------|---------|
| `eslint-plugin-react-hooks` | Enforces rules of hooks and dependency arrays |
| `@typescript-eslint` | TypeScript-aware linting |
| `react-query` / `swr` | Data fetching with caching, loading, and error states built in |
| `react-window` | Virtualized lists |
| `dompurify` | HTML sanitization |
| `zod` | Runtime schema validation for API responses |
| React DevTools Profiler | Identify actual performance bottlenecks before optimizing |

---

*This document is intended as a living reference. Open a PR to suggest additions or corrections.*
