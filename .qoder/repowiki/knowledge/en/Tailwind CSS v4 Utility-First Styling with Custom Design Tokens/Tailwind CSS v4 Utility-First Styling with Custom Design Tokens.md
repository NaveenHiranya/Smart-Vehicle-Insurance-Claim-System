---
kind: frontend_style
name: Tailwind CSS v4 Utility-First Styling with Custom Design Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/pages/LoginPage.tsx
---

## What system/approach is used

The frontend uses a **utility-first CSS approach** built on **Tailwind CSS v4** (`tailwindcss@^4.3.3`) integrated via the `@tailwindcss/vite` plugin in Vite (`vite.config.ts`). There is no separate Tailwind config file — configuration is declared inline using the new `@theme` directive inside `src/index.css`. The UI also uses **Lucide React** (`lucide-react@^1.34.0`) as the icon library, and styling is composed directly in component JSX via Tailwind utility classes (no CSS-in-JS libraries, no SCSS/SASS, no styled-components).

## Key files and packages

- `frontend/package.json` — declares `tailwindcss`, `@tailwindcss/vite`, and `lucide-react` as dependencies.
- `frontend/src/index.css` — single source of global styles: imports Tailwind via `@import "tailwindcss"`, defines design tokens under `@theme`, sets base body font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), and applies a global `box-sizing: border-box` reset.
- `frontend/vite.config.ts` — registers the `@tailwindcss/vite` plugin so Tailwind v4's CSS-first configuration is processed at build time.
- `frontend/src/components/Layout.tsx` — representative example of how components compose layout, spacing, colors, typography, and responsive breakpoints entirely through Tailwind utilities.
- `frontend/src/pages/LoginPage.tsx` — example of page-level styling using the custom semantic color tokens.

## Architecture and conventions

### Design tokens via `@theme`
All visual identity lives in `src/index.css` under a single `@theme` block that defines:
- A `primary` palette from `50` to `900` (blue tones centered on `#3b82f6`).
- Semantic status palettes: `danger` (red), `success` (green), `warning` (amber), each exposing key shades.
These tokens are consumed throughout the app as `text-primary-600`, `bg-primary-50`, `focus:ring-primary-500`, etc., rather than raw hex values or Tailwind defaults.

### Component styling pattern
Components are plain React/TSX files that style themselves inline with Tailwind class strings. There are no per-component CSS modules or scoped stylesheets. Layout, spacing, typography, hover/focus states, and responsive behavior are all expressed as utility classes on elements. For example, `Layout.tsx` builds a desktop sidebar + mobile header/bottom-nav layout using breakpoint prefixes (`lg:`) and conditional class composition.

### Responsive strategy
Responsive behavior is handled by Tailwind's standard breakpoint prefixes (`sm:`, `lg:`). The `Layout` component shows a fixed desktop sidebar hidden on small screens (`hidden lg:flex`) and a collapsible mobile sidebar with an overlay, plus a fixed bottom navigation bar for mobile (`lg:hidden`).

### Iconography
Icons come exclusively from `lucide-react` (e.g. `Shield`, `Menu`, `LogOut`, `AlertCircle`, `Wrench`) and are rendered as React components sized with Tailwind width/height utilities (`h-5 w-5`, `h-8 w-8`).

### Global resets
`index.css` applies a minimal global reset: removes body margin, sets a system font stack with antialiasing, and forces `box-sizing: border-box` on all elements.

## Conventions and constraints

- **No custom CSS beyond `index.css`**: All styling is done via Tailwind utilities; there are no additional `.css` files imported into components.
- **Semantic color usage**: Components reference the project's `primary-*`, `danger-*`, `success-*`, `warning-*` tokens instead of arbitrary colors, ensuring consistent theming.
- **Utility-only styling**: No CSS modules, CSS-in-JS, or preprocessor chains are used — every style rule is a Tailwind utility class applied directly in JSX.
- **Breakpoint-based responsiveness**: Mobile/desktop variants are consistently expressed with Tailwind's `sm:` / `lg:` prefixes rather than media queries written by hand.
- **Icon standardization**: All icons are sourced from `lucide-react`; no SVGs are inlined or loaded from static assets for UI icons.