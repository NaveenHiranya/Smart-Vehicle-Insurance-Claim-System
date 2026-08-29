---
kind: frontend_style
name: Tailwind CSS v4 Design System with Custom Theme Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/pages/LoginPage.tsx
---

## What system/approach is used

The frontend (a Vite + React application) styles its UI exclusively with **Tailwind CSS v4** (`tailwindcss@^4.3.3`, `@tailwindcss/vite@^4.3.3`) configured via the Vite plugin in `vite.config.ts`. There are no CSS-in-JS libraries, Sass/SCSS preprocessors, or component UI kits — styling is done through utility classes applied directly in JSX and a small set of global tokens defined in `src/index.css`.

Icons come from **lucide-react** (`^1.34.0`), which is imported as SVG components rather than via a font or sprite. No other visual component library (e.g. shadcn, Radix, MUI) is present.

## Key files and packages

- `frontend/src/index.css` — single source of global theme tokens via Tailwind's `@theme` block; also imports Tailwind with `@import "tailwindcss"`.
- `frontend/vite.config.ts` — registers the `@tailwindcss/vite` plugin and sets up dev proxy for `/api` and `/uploads`.
- `frontend/package.json` — declares Tailwind v4, lucide-react, react-router-dom, axios, react-dropzone as dependencies; build uses `tsc -b && vite build`.
- Layout components: `frontend/src/components/Layout.tsx` (user portal sidebar + mobile bottom nav), `frontend/src/components/AdminLayout.tsx` (collapsible dark-sidebar admin panel), `frontend/src/components/GarageLayout.tsx`.
- Page components under `frontend/src/pages/` (and subfolders `admin/`, `garage/`) compose layouts with Tailwind utility classes.

## Architecture and conventions

### Design tokens via Tailwind `@theme`
All brand colors, semantic color scales, and custom animations live in `src/index.css` inside an `@theme` block:

- **Primary palette**: `primary-50` through `primary-900` (blue scale centered on `#3b82f6`).
- **Semantic palettes**: `danger-*` (red), `success-*` (green), `warning-*` (amber).
- **Custom animation**: `--animate-float` driving a gentle floating keyframe used on hero illustrations.

These tokens are consumed everywhere as `bg-primary-600`, `text-danger-700`, `ring-primary-500/10`, etc., so there is no ad-hoc hex usage in components beyond what appears in the theme file.

### Utility-first class composition
Components are styled by composing long chains of Tailwind utilities directly in `className` props. Examples observed across layouts and pages:

- Gradients: `bg-gradient-to-br from-primary-600 to-primary-800`, `bg-gradient-to-r from-primary-600 to-primary-500`.
- Shadows: `shadow-md shadow-primary-600/25`, `shadow-lg shadow-primary-600/25`.
- Focus states: `focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10`.
- Rounded corners: consistently `rounded-xl` for cards, buttons, inputs.
- Spacing: consistent use of `space-y-*`, `gap-*`, `p-4 sm:p-6 lg:p-8`.

### Responsive strategy
Responsive breakpoints are used inline via Tailwind's responsive prefixes (`sm:`, `lg:`). The layout switches between:
- Desktop: fixed left sidebar (`lg:flex lg:w-64`) with main content offset by `lg:ml-64`.
- Mobile: top header bar with hamburger toggle, full-screen overlay sidebar, and a fixed bottom tab bar showing the first four nav items.

### Layout architecture
Three layout components encapsulate per-portal chrome:
- `Layout.tsx` — light-themed user dashboard with persistent sidebar and mobile bottom nav.
- `AdminLayout.tsx` — dark-themed (`bg-gray-900`) collapsible sidebar (`w-16` vs `w-56`) with state-driven width transitions.
- `GarageLayout.tsx` — garage-specific layout following the same pattern.

Each layout composes `children` inside a `<main>` with consistent padding, keeping page content focused on business logic.

### Iconography
Icons are imported from `lucide-react` as named components (`Shield`, `LayoutDashboard`, `Car`, `FileText`, `ClipboardList`, `User`, `LogOut`, `Menu`, `X`, `AlertCircle`, `Lock`, `Wrench`, `Mail`, `ArrowRight`, etc.) and rendered inline at fixed sizes (`h-5 w-5`, `h-7 w-7`). No icon fonts or SVG sprites are used.

### Global base styles
`index.css` applies minimal resets: `body` uses the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with antialiasing enabled, and `* { box-sizing: border-box }` is set globally.

## Conventions and constraints

- **No CSS modules, no SCSS/Sass, no styled-components** — all styling is Tailwind utility classes plus the single `index.css` token file.
- **Brand colors must come from the `@theme` block** — components reference `primary-*`, `danger-*`, `success-*`, `warning-*` tokens rather than raw hex values, ensuring consistency.
- **Rounded corners are uniformly `rounded-xl`** across cards, buttons, inputs, and badges.
- **Active navigation items** are styled with the gradient `bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/25` pattern (user layout) or solid `bg-primary-600 text-white` (admin layout).
- **Form inputs** follow a shared pattern: `border border-gray-200 bg-gray-50/80 rounded-xl py-3 pl-11 pr-4 text-sm` with `focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10`.
- **Error/alert banners** use the semantic danger tokens: `border-danger-500/20 bg-danger-50 text-danger-700`.
- **Icon size convention**: icons inside buttons/links are `h-5 w-5`; logo/header icons are larger (`h-7 w-7`, `h-9 w-9`).
- **Mobile-first responsive patterns**: desktop-only elements use `hidden lg:flex`, mobile-only overlays use `lg:hidden`, and typography/spacing scale with `sm:` / `lg:` prefixes.
- **Animations are declared as design tokens** under `@theme` (e.g. `--animate-float`) and referenced via Tailwind's `animate-*` utilities rather than ad-hoc `@keyframes` in components.