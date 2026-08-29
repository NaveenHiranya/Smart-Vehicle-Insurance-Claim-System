---
kind: frontend_style
name: Tailwind CSS v4 with Custom Design Tokens and Tailwind-First Styling
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/package.json
    - frontend/src/index.css
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
---

## What system/approach is used

The frontend (`frontend/`) uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) as the sole styling framework. There is no separate CSS-in-JS library, SCSS/Sass pipeline, or component UI kit. All visual styling is expressed through utility classes directly in JSX components. Icons are provided by **lucide-react**, imported per-component.

## Key files and packages

- `frontend/package.json` — declares `tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`, and `lucide-react: ^1.34.0` as dependencies; no other styling-related packages.
- `frontend/src/index.css` — single global stylesheet that imports Tailwind via `@import "tailwindcss"` and defines the project's design tokens under the Tailwind v4 `@theme` block.
- `frontend/src/components/Layout.tsx` — user-facing layout (sidebar + mobile bottom nav) demonstrating responsive breakpoints and token usage.
- `frontend/src/components/AdminLayout.tsx` — admin-panel layout with a collapsible dark sidebar, also using the same token set.
- `frontend/src/components/GarageLayout.tsx` — garage-role layout following the same pattern.

## Architecture and conventions

### Design tokens
All colors are centralized in `src/index.css` inside a Tailwind v4 `@theme` block:
- A blue **primary** palette from `--color-primary-50` to `--color-primary-900`.
- Semantic palettes for feedback: **danger** (red), **success** (green), **warning** (amber), each exposing at least a base shade plus light variants.
These custom tokens are consumed throughout the app via their full names (e.g. `text-primary-600`, `bg-primary-50`, `text-danger-600`).

### Global reset
`index.css` applies a minimal reset: `body` sets a system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with antialiasing, and `* { box-sizing: border-box; }` ensures consistent sizing.

### Layout strategy
- Three layout components provide role-specific chrome: `Layout` (user), `AdminLayout` (admin), `GarageLayout` (garage). Each composes a fixed sidebar plus a scrollable main area.
- The user `Layout` includes both a desktop sidebar (`hidden lg:flex`) and a mobile-only bottom tab bar (`lg:hidden fixed bottom-0`), toggled via React state for a hamburger menu overlay.
- The `AdminLayout` supports a collapsible sidebar whose width (`w-16` vs `w-56`) and main content margin (`ml-16` vs `ml-56`) are driven by a single `collapsed` boolean.

### Responsive approach
Responsive behavior is achieved entirely with Tailwind's built-in breakpoints (`sm:`, `md:`, `lg:`) applied inline in JSX class strings — there is no media-query CSS file. For example, `hidden lg:flex` hides elements on small screens and shows them at `lg`.

### Iconography
Icons come exclusively from `lucide-react`. Each layout imports only the icons it needs (e.g. `Shield, LayoutDashboard, Car, FileText, ClipboardList, User, LogOut, Menu, X` in `Layout.tsx`; `Shield, LayoutDashboard, Users, ClipboardList, FileText, LogOut, Wrench, ChevronLeft, ChevronRight` in `AdminLayout.tsx`). Icons are sized with Tailwind utilities like `h-5 w-5` or `h-8 w-8`.

### Component structure
Pages live under `src/pages/` (user, admin, garage subfolders) and compose layout wrappers around content. There are no scoped CSS modules or CSS-in-JS style objects — every visual detail is expressed as Tailwind utility classes concatenated in the `className` prop.

## Conventions and constraints

- **No external UI component libraries** (no shadcn, MUI, AntD, etc.) — all UI primitives are hand-built with Tailwind utilities.
- **Colors must come from the defined tokens** — the codebase consistently references `primary-*`, `danger-*`, `success-*`, `warning-*` rather than arbitrary hex values, keeping the palette centralized in `index.css`.
- **Global styles are minimal** — only the Tailwind import, theme tokens, body font, and `box-sizing` reset live in `index.css`; everything else is component-scoped via className.
- **Responsive patterns are breakpoint-driven** — visibility toggles use `hidden`/`flex` with `lg:` prefixes; mobile-only navigation is gated with `lg:hidden`.
- **Icon size is controlled via Tailwind** — icon dimensions are specified with `h-* w-*` utilities rather than CSS properties.