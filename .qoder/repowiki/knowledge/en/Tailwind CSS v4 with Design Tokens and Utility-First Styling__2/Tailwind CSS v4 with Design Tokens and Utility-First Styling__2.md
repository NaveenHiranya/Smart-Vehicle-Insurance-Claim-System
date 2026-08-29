---
kind: frontend_style
name: Tailwind CSS v4 with Design Tokens and Utility-First Styling
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/pages/DashboardPage.tsx
---

## What system/approach is used

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) in a utility-first approach. There is no component library, CSS-in-JS, or SCSS preprocessor — styling lives entirely in inline Tailwind utility classes on React components, with a single global stylesheet (`src/index.css`) that imports Tailwind and declares design tokens via the Tailwind v4 `@theme` block.

Icons are provided by **lucide-react**, which integrates directly as JSX components inside Tailwind-styled elements.

## Key files and packages

- `frontend/package.json` — declares `tailwindcss ^4.3.3`, `@tailwindcss/vite ^4.3.3`, and `lucide-react ^1.34.0` as dependencies; no other UI framework or CSS tooling.
- `frontend/src/index.css` — the only global stylesheet. It imports Tailwind (`@import "tailwindcss"`) and defines the application's design tokens under `@theme`: a full `primary` color scale (50–900), plus semantic `danger`, `success`, and `warning` scales. It also sets the base font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), resets margins, and applies `box-sizing: border-box` globally.
- `frontend/vite.config.ts` — registers the `@tailwindcss/vite` plugin so Tailwind v4 processes styles during Vite dev/build.
- `frontend/src/components/Layout.tsx` — user-facing layout with sidebar, mobile header, and bottom nav; demonstrates responsive breakpoints (`lg:`, `sm:`) and consistent use of the custom `primary-*` tokens.
- `frontend/src/components/AdminLayout.tsx` — admin portal layout using a dark sidebar (`bg-gray-900`) with the same `primary-*` tokens for active states and branding.
- Page components under `frontend/src/pages/` (e.g. `DashboardPage.tsx`, `ClaimsPage.tsx`, `AdminDashboardPage.tsx`) compose layouts and style all UI purely through Tailwind utilities.

## Architecture and conventions

- **Single source of truth for colors**: All brand and semantic colors come from the `@theme` tokens in `index.css`. Components reference them as `text-primary-600`, `bg-primary-50`, `border-primary-700`, etc. Status colors in pages sometimes fall back to Tailwind defaults (e.g. `bg-blue-100 text-blue-700` for status badges) rather than the custom palette, but the primary brand surface consistently uses `primary-*`.
- **Utility-first, no CSS modules or BEM**: No per-component CSS files exist. All visual rules are expressed as Tailwind class strings directly on JSX elements.
- **Responsive strategy**: Mobile-first with Tailwind's built-in breakpoints. The user layout hides the desktop sidebar behind `hidden lg:flex` and shows a mobile-only bottom navigation bar and hamburger menu. Admin layout uses a fixed sidebar visible at all sizes (`w-64`).
- **Layout composition**: Two top-level layout wrappers encapsulate shared chrome:
  - `Layout.tsx` — light theme, white sidebar, gray-50 background, mobile bottom nav.
  - `AdminLayout.tsx` — dark theme sidebar (`bg-gray-900`), gray-100 page background, fixed left rail.
- **Iconography**: Icons are imported from `lucide-react` and sized with Tailwind utilities (`h-5 w-5`, `h-8 w-8`). No icon fonts or SVG sprites are used beyond the two static assets in `public/icons.svg`.
- **Typography**: Base typography is inherited from the system font stack declared in `index.css`; headings and body text are styled via Tailwind's `text-*` utilities (e.g. `text-2xl sm:text-3xl font-bold text-gray-900`).
- **Cards and surfaces**: Consistent pattern across pages — white cards with `rounded-xl`, `shadow-sm`, `border border-gray-200`, and internal padding (`p-6`).

## Conventions and constraints

- **Brand colors must be referenced via the `primary-*` tokens** defined in `@theme` rather than hard-coded hex values — this is enforced by the presence of the token definitions and their consistent usage throughout both layouts.
- **Semantic colors** (`danger-*`, `success-*`, `warning-*`) are available for stateful UI (alerts, badges) but are not yet widely adopted in page components; when used, they should map to these tokens instead of arbitrary colors.
- **No custom Tailwind configuration file** (`tailwind.config.js/ts`) exists — customization is exclusively done through the `@theme` block in `index.css`, which is the Tailwind v4 recommended approach.
- **Responsive patterns follow mobile-first**: hidden-on-small / shown-on-large (`hidden lg:flex`) for sidebars, and explicit `sm:` / `lg:` breakpoints for grid columns and spacing.
- **Components are styled inline with Tailwind classes**; there is no convention for extracting reusable style fragments into separate CSS files or CSS-in-JS objects.