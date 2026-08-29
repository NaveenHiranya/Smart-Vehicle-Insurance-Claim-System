---
kind: frontend_style
name: Tailwind CSS v4 Design Tokens and Component Styling
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/components/GlobalAIAssistant.tsx
---

## What system/approach is used

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) with a **CSS-based design token system** defined through the Tailwind v4 `@theme` block. There is no separate `tailwind.config.js/ts` file — all configuration lives in `src/index.css`. Icons come from **lucide-react**. No UI component library (e.g. shadcn, MUI) is used; every visual element is composed directly from Tailwind utility classes.

## Key files and packages

- `frontend/src/index.css` — single source of truth for theme tokens and global resets (`@import "tailwindcss"`, `@theme { ... }`, body font stack, `box-sizing: border-box`).
- `frontend/package.json` — declares `tailwindcss ^4.3.3`, `@tailwindcss/vite ^4.3.3`, `lucide-react ^1.34.0`; no other styling dependencies.
- Layout components that establish shared visual structure:
  - `frontend/src/components/Layout.tsx` — user app layout (light sidebar, mobile bottom nav).
  - `frontend/src/components/AdminLayout.tsx` — admin portal layout (dark sidebar, collapsible).
  - `frontend/src/components/GarageLayout.tsx` — garage portal layout (dark sidebar, orange accent).
- Page components under `frontend/src/pages/` and `frontend/src/pages/admin/`, `frontend/src/pages/garage/` compose all UI via inline Tailwind utilities.

## Architecture and conventions

### Design tokens
All brand colors are declared as semantic tokens in `@theme` inside `index.css`:
- `--color-primary-{50..900}` — blue scale (primary action color).
- `--color-danger-{50,500,600,700}` — error/alert color.
- `--color-success-{50,500,600}` — success state color.
- `--color-warning-{50,500,600}` — warning state color.

These tokens are consumed throughout the codebase via Tailwind's arbitrary value syntax (e.g. `bg-primary-600`, `text-primary-700`, `hover:bg-primary-700`, `focus:ring-primary-200`). The Garage layout additionally uses Tailwind's built-in `orange-*` palette for its accent, while Admin and User layouts use the custom `primary-*` tokens.

### Global reset
`index.css` applies a minimal reset: `body` uses the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with antialiasing enabled, and `* { box-sizing: border-box; }` ensures consistent sizing.

### Layout patterns
Three layout components provide consistent chrome:
- **User layout** (`Layout.tsx`): light background (`bg-gray-50`), white fixed left sidebar on desktop (`lg:flex lg:w-64`), mobile header with hamburger, mobile bottom tab bar, and an injected `GlobalAIAssistant` floating widget.
- **Admin layout** (`AdminLayout.tsx`): dark sidebar (`bg-gray-900`), collapsible width toggled via state (`w-16` vs `w-56`), active item highlighted with `bg-primary-600 text-white`.
- **Garage layout** (`GarageLayout.tsx`): dark sidebar with `orange-600` active state instead of primary.

### Responsive strategy
Responsive breakpoints follow Tailwind defaults (`sm:`, `lg:`). Common patterns include:
- Sidebar hidden on small screens (`hidden lg:flex`) and revealed via a mobile drawer or bottom nav.
- Padding scales with breakpoint (`p-4 sm:p-6 lg:p-8`).
- Icon sizes scale (`h-4 w-4 sm:h-5 sm:w-5`).

### Styling composition
Components are styled entirely with **utility-first classes** — no CSS modules, no SCSS, no class-name mapping. Visual states are expressed inline using conditional class concatenation (e.g. `isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'`). Transitions are applied via `transition`, `transition-colors`, and `transition-all duration-200`.

### Iconography
Icons are imported from `lucide-react` and rendered as React components sized with Tailwind (`h-5 w-5`, `h-8 w-8`, etc.).

## Conventions and constraints

- **No `tailwind.config.*` file exists.** All theme customization goes into the `@theme` block in `src/index.css`; adding new tokens must be done there to be usable as `bg-*` / `text-*` utilities.
- **Brand colors must come from the `primary-*` token scale**, not ad-hoc hex values. All observed usage across pages and components references `primary-{50..900}`.
- **Semantic status colors** (`danger-*`, `success-*`, `warning-*`) are reserved for alerts, errors, and feedback rather than branding.
- **Layout chrome is centralized** in the three `*Layout.tsx` components; page components should only contain content, not repeat sidebar/header markup.
- **Responsive behavior** consistently uses Tailwind's `sm:` / `lg:` prefixes rather than media queries in CSS.
- **Interactions** rely on Tailwind's built-in variants (`hover:`, `focus:`, `disabled:`) plus `transition` / `transition-colors` for smooth state changes.
- **No additional CSS framework or preprocessor** is configured; the project is pure Tailwind + vanilla CSS.