---
kind: frontend_style
name: Tailwind CSS v4 with Custom Design Tokens for Multi-Role Dashboard UI
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/App.tsx
---

## What system/approach is used

The frontend (a React + Vite application) styles its UI exclusively with **Tailwind CSS v4** (`tailwindcss@^4.3.3`, `@tailwindcss/vite@^4.3.3`). There are no CSS-in-JS libraries, SCSS preprocessors, or component UI kits — styling is done via utility classes directly on JSX elements and a small set of global design tokens defined in the root stylesheet.

Icons come from **lucide-react**, which provides consistent SVG iconography across all layouts and pages.

## Key files and packages

- `frontend/src/index.css` — single source of Tailwind imports and custom design tokens via the Tailwind v4 `@theme` directive; also sets global body font stack and `box-sizing: border-box`.
- `frontend/package.json` — declares Tailwind v4 as a dev dependency and lucide-react as the sole visual library beyond React itself.
- `frontend/src/components/Layout.tsx` — user-facing layout with sidebar navigation, mobile responsive header/bottom nav, and the global AI assistant overlay.
- `frontend/src/components/AdminLayout.tsx` — admin-panel layout using a dark sidebar (`bg-gray-900`) to visually distinguish the admin role.
- `frontend/src/components/GarageLayout.tsx` — garage-role layout (parallel structure to AdminLayout).
- `frontend/src/pages/LoginPage.tsx` — representative page showing form styling, error banners, gradient backgrounds, and link variants.
- `frontend/src/App.tsx` — route tree that wraps user/admin/garage routes with their respective Layout components and role-gated route wrappers.

## Architecture and conventions

### Design tokens
All colors are centralized in `index.css` under a `@theme` block:
- A blue **primary** scale (`--color-primary-50` through `--color-primary-900`).
- Semantic status scales: **danger** (`50/500/600/700`), **success** (`50/500/600`), **warning** (`50/500/600`).
These tokens are referenced throughout the codebase as `text-primary-600`, `bg-danger-50`, `focus:ring-primary-500`, etc., ensuring a single source of truth for brand colors.

### Global reset
`index.css` applies a minimal reset: `body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-osx-font-smoothing: grayscale; }` plus `* { box-sizing: border-box; }`. No other global CSS exists.

### Layout pattern
Three distinct layout components encapsulate per-role chrome:
- `Layout.tsx` — light background (`bg-gray-50`), white sidebar, top mobile header, bottom mobile tab bar, and a fixed `GlobalAIAssistant`.
- `AdminLayout.tsx` — dark sidebar (`bg-gray-900`, `border-gray-700`) with white text to signal an administrative context.
- `GarageLayout.tsx` — mirrors the admin layout structure for the garage role.
Each layout defines its own `navItems` array and uses `location.pathname.startsWith(item.path)` to compute active state, applying `bg-primary-50 text-primary-700` (user) or `bg-primary-600 text-white` (admin) accordingly.

### Responsive strategy
Responsive breakpoints are used inline via Tailwind's `lg:` prefix:
- Desktop: fixed sidebar (`hidden lg:flex lg:w-64`) with content offset by `lg:ml-64` / `lg:pt-0`.
- Mobile: hidden sidebar replaced by a sticky top header with a hamburger toggle and a fixed bottom tab bar (`lg:hidden fixed bottom-0`).
- Content padding scales with `p-4 sm:p-6 lg:p-8`.

### Component-level styling
Pages and components compose Tailwind utilities directly in JSX className strings. Common patterns observed:
- Cards use `bg-white rounded-2xl shadow-xl p-8`.
- Forms use `w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`.
- Buttons use `bg-primary-600 text-white ... hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50`.
- Error banners combine semantic tokens: `bg-danger-50 border border-danger-500/20 text-danger-700`.
- Gradients for hero/login screens: `bg-gradient-to-br from-primary-50 to-blue-100`.

### Role-based theming
The same token set is reused across roles, but layout backgrounds differentiate them:
- User area: `bg-gray-50` main, white sidebar.
- Admin area: `bg-gray-100` main, `bg-gray-900` sidebar.
This avoids duplicating color definitions while keeping visual separation between portals.

## Conventions and constraints

- **No separate CSS modules or styled-components**: all styling lives in inline Tailwind utility classes within JSX and the single `index.css` file.
- **Colors must come from the `@theme` tokens** in `index.css`; no arbitrary hex values are used for brand/status colors in the codebase (e.g. `text-primary-600`, not `#2563eb`).
- **Layouts are role-scoped**: each role (user, admin, garage) has its own Layout component that owns sidebar, navigation, and chrome — pages only render content via `{children}`.
- **Navigation state is derived from `useLocation()`** rather than props, so active-link highlighting is consistent across all layouts.
- **Icons are sourced from lucide-react** and sized uniformly with `h-5 w-5` (sidebar items) or `h-8 w-8` (logo area).
- **Mobile-first responsive behavior** is expressed entirely through Tailwind breakpoint prefixes (`sm:`, `lg:`); there is no media-query CSS.
- **Form inputs follow a uniform pattern**: label → input with `border-gray-300`, `rounded-lg`, `focus:ring-2 focus:ring-primary-500`, and `transition` for smooth focus states.