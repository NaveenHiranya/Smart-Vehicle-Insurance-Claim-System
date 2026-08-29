---
kind: frontend_style
name: Tailwind CSS v4 with Design Tokens and Utility-First Styling
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/package.json
    - frontend/src/index.css
    - frontend/src/App.tsx
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/pages/admin/AdminDashboardPage.tsx
---

## What system/approach is used

The frontend (`frontend/`) uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) in a utility-first approach. There is no separate CSS framework, component library, or CSS-in-JS solution — all visual styling is done through Tailwind utility classes applied directly in JSX via the `className` attribute. Icons are provided by **lucide-react**, which supplies consistent SVG icon components used throughout the UI.

## Key files and packages

- `frontend/package.json` — declares `tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`, and `lucide-react: ^1.34.0` as dependencies.
- `frontend/src/index.css` — single global stylesheet that imports Tailwind (`@import "tailwindcss"`) and defines the project's design tokens under the Tailwind v4 `@theme` block.
- `frontend/src/components/Layout.tsx`, `AdminLayout.tsx`, `GarageLayout.tsx` — layout shells that compose the shared sidebar/header patterns using Tailwind utilities.
- `frontend/src/pages/**` — page components where all per-page styling lives inline via `className` strings.
- `frontend/src/App.tsx` — routes wrap every page in either `Layout`, `AdminLayout`, or `GarageLayout`, ensuring consistent chrome across roles.

## Architecture and conventions

### Design tokens
All colors are centralized in `src/index.css` under `@theme`, defining semantic palettes:
- `--color-primary-*` (50–900): brand blue scale.
- `--color-danger-*`: error/alert reds.
- `--color-success-*`: confirmation greens.
- `--color-warning-*`: caution ambers.

These tokens are consumed in components as `text-primary-600`, `bg-primary-50`, `border-primary-300`, etc., keeping color usage consistent without hard-coded hex values in JSX.

### Global resets
`index.css` sets a minimal reset: `body` uses `system-ui` font stack with antialiasing, and `* { box-sizing: border-box; }` ensures predictable sizing.

### Layout system
Three layout components provide role-specific chrome:
- `Layout` — customer-facing app with a light sidebar, mobile header, bottom tab bar, and responsive breakpoints (`lg:` for desktop).
- `AdminLayout` — dark sidebar (`bg-gray-900`) with collapsible state toggled between `w-16` and `w-56`, plus a main area offset by `ml-16` / `ml-56`.
- `GarageLayout` — mirrors admin/customer layouts for garage users.

Each layout composes navigation items from local arrays, derives active state from `useLocation().pathname.startsWith(...)`, and renders icons from `lucide-react`.

### Responsive strategy
Responsive behavior is expressed purely through Tailwind's breakpoint prefixes (`sm:`, `lg:`) inside `className` strings — e.g., `hidden lg:flex` to show/hide the desktop sidebar, `lg:hidden` for mobile-only elements, and `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for dashboard cards.

### Iconography
Icons come exclusively from `lucide-react` (e.g., `Shield`, `LayoutDashboard`, `Car`, `FileText`, `ClipboardList`, `User`, `LogOut`, `Menu`, `X`, `ChevronLeft`, `ChevronRight`, `ArrowRight`). They are sized consistently with `h-5 w-5` or similar utility classes.

### Component structure
There are no reusable styled UI primitives (no button, card, input components). Every visual element is composed inline in page/layout components using concatenated template literals for conditional classes, e.g.:
```tsx
className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
}`}
```
This pattern appears across `Layout.tsx`, `AdminLayout.tsx`, and page components like `AdminDashboardPage.tsx`.

## Conventions and constraints

- **No custom CSS beyond `index.css`**: All styling is utility-first via Tailwind; no additional `.css` files exist under `src/`.
- **Colors must use design tokens**: Brand and semantic colors are accessed via `primary-*`, `danger-*`, `success-*`, `warning-*` tokens defined in `@theme`; ad-hoc hex values are avoided in JSX.
- **Role-based layouts enforced at routing level**: Every protected route wraps its page in the appropriate layout component (`Layout`, `AdminLayout`, `GarageLayout`) as declared in `App.tsx`, so each role gets a consistent chrome.
- **Responsive breakpoints follow Tailwind defaults**: `sm:`, `md:`, `lg:` prefixes are used consistently for mobile-first responsive layouts.
- **Icons are sourced only from lucide-react**: No inline SVGs or image assets are used for UI icons.
- **No third-party UI component library**: Buttons, cards, tables, inputs, etc., are built from scratch using Tailwind utilities rather than imported from libraries like shadcn, MUI, or Ant Design.