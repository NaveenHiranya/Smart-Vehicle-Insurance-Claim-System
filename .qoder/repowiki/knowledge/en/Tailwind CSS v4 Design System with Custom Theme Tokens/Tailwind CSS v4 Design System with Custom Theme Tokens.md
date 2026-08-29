---
kind: frontend_style
name: Tailwind CSS v4 Design System with Custom Theme Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/components/AuthBrandPanel.tsx
    - frontend/src/pages/LoginPage.tsx
---

## What system/approach is used

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) as the sole styling framework. There are no CSS-in-JS libraries, SCSS preprocessors, or component UI kits — all visual styling is expressed through Tailwind utility classes directly in JSX `className` attributes. The project defines a custom design token set via Tailwind's `@theme` block and pairs it with the **Lucide React** icon library for consistent iconography.

## Key files and packages

- `frontend/src/index.css` — single source of truth for global styles and theme tokens; imports Tailwind via `@import "tailwindcss"`, declares the full color palette and animation under `@theme`, sets the base font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), applies `box-sizing: border-box` globally, and resets body margins.
- `frontend/package.json` — declares `tailwindcss ^4.3.3` and `@tailwindcss/vite ^4.3.3` as dev dependencies; no other styling-related packages.
- `frontend/src/components/Layout.tsx`, `AdminLayout.tsx`, `GarageLayout.tsx` — shared layout shells that establish the app-wide sidebar/header/bottom-nav patterns using Tailwind utilities.
- `frontend/src/components/AuthBrandPanel.tsx` — reusable branded panel used by both `LoginPage` and `RegisterPage` to keep auth screens visually identical.
- `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `DashboardPage.tsx`, etc. — page components compose layouts and use only Tailwind utilities for their own markup.
- `frontend/public/icons.svg` — sprite sheet referenced by Lucide icons.

## Architecture and conventions

### Design tokens
All colors are defined as semantic CSS custom properties inside the `@theme` block:
- `primary-*` (50–900): brand blue scale used for gradients, active states, links, and shadows.
- `danger-*` (50/500/600/700): error/alert coloring.
- `success-*` (50/500/600): positive confirmation states.
- `warning-*` (50/500/600): caution states.
A custom `animate-float` keyframe animation is also declared here and reused on the car illustration in the auth panels.

### Color usage pattern
Components consistently reference the semantic tokens rather than raw hex values. For example, buttons use `bg-gradient-to-r from-primary-600 to-primary-700` with matching `shadow-primary-600/25`; alerts use `border-danger-500/20 bg-danger-50 text-danger-700`; success/warning follow the same token-based naming. This keeps the palette centralized in `index.css`.

### Typography
No custom font file is loaded; the app relies on the system font stack declared in `index.css`. Font sizing uses Tailwind's built-in scale (`text-[10px]`, `text-[11px]`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`) and weight classes (`font-medium`, `font-semibold`, `font-bold`).

### Layout & responsive strategy
- Mobile-first responsive breakpoints are used throughout (`sm:`, `lg:`, `xl:`). The main `Layout` hides the desktop sidebar on small screens and shows a bottom tab bar instead (`lg:hidden fixed bottom-0...`).
- A split-screen auth layout uses `grid min-h-dvh lg:grid-cols-2` to show the brand panel on desktop and a scrollable form on mobile.
- Fixed top header with `backdrop-blur` and `bg-white/90` for the mobile nav.
- Admin and garage layouts each have their own dark-sidebar shell (`bg-gray-900`) distinct from the user-facing light `bg-gray-50` dashboard.

### Component composition
Reusable UI building blocks live in `src/components/`: `Layout` (user app shell), `AdminLayout`, `GarageLayout`, `AuthBrandPanel`, `CarIllustration`, `GlobalAIAssistant`, and route guards (`ProtectedRoute`, `AdminProtectedRoute`, `GarageProtectedRoute`). Pages in `src/pages/` compose these primitives with page-specific content. No atomic/component library beyond this is used.

### Iconography
Icons come exclusively from `lucide-react` (e.g. `Shield`, `LayoutDashboard`, `Car`, `FileText`, `ClipboardList`, `User`, `LogOut`, `Menu`, `X`, `AlertCircle`, `Lock`, `Wrench`, `Mail`, `ArrowRight`, `Camera`, `Zap`). They are imported per-component and rendered as `<Icon className="h-5 w-5" />`.

### Animation
Only one custom animation exists: `animate-float` (a gentle vertical translate oscillation over 6s), applied to the car illustration on auth pages via `animate-float xl:mt-8`.

## Conventions and constraints

- **Single stylesheet**: All global styles and theme tokens live in `frontend/src/index.css`; there are no additional `.css` files imported elsewhere.
- **Utility-only styling**: Components never define custom CSS classes — every visual property is expressed as a Tailwind utility in `className` strings.
- **Semantic color tokens**: New colors should be added to the `@theme` block in `index.css` using the established `name-scale` naming convention (e.g. `--color-primary-500`) and consumed as `text-primary-500`, `bg-primary-500`, etc., not as raw hex values.
- **Consistent spacing/radius**: Rounded corners consistently use `rounded-xl` or `rounded-2xl`; padding uses `p-4`, `p-6`, `p-8`, `px-3.5 py-2.5`; gaps use `gap-2`, `gap-3`, `gap-3.5`, `space-y-1`, `space-y-4`.
- **Shadows**: Brand elements use colored shadows via `shadow-primary-600/25` / `shadow-primary-600/30` rather than default gray shadows.
- **Focus states**: Inputs declare explicit focus rings (`focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10`) to maintain accessibility without extra CSS.
- **Responsive breakpoints**: The codebase consistently uses Tailwind's `sm:`, `lg:`, `xl:` prefixes to adapt layouts between mobile and desktop; no media queries are written outside `index.css`.