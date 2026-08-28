---
kind: frontend_style
name: Tailwind CSS v4 Utility-First Styling with Custom Design Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/package.json
    - frontend/src/index.css
    - frontend/src/components/Layout.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/admin/AdminDashboardPage.tsx
---

## Approach
The frontend uses a **utility-first** styling approach built on **Tailwind CSS v4** (`tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`) integrated via Vite. There are no component libraries (e.g., shadcn, MUI) or CSS-in-JS solutions — all visual presentation is expressed through Tailwind utility classes applied directly in JSX.

## Key Files and Packages
- `frontend/package.json` — declares Tailwind CSS v4 and the Vite plugin as dev dependencies; icons come from `lucide-react`.
- `frontend/src/index.css` — single global stylesheet that imports Tailwind (`@import "tailwindcss"`) and defines the project's design tokens inside an `@theme` block.
- `frontend/src/components/Layout.tsx` — shared layout wrapping customer pages; demonstrates responsive breakpoints, sidebar/overlay patterns, and consistent use of custom tokens.
- `frontend/src/pages/*.tsx` — page components compose layouts and UI using inline Tailwind utilities; no per-component CSS files exist.

## Architecture and Conventions
- **Design tokens via `@theme`**: All brand colors are declared as CSS custom properties under `--color-primary-*` (50–900 scale), plus semantic palettes for `danger-*`, `success-*`, and `warning-*`. Components reference these tokens (e.g., `bg-primary-600`, `text-danger-700`, `focus:ring-primary-500`) rather than hard-coded hex values.
- **Global reset**: The root `body` sets a system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) with antialiasing, and a universal `box-sizing: border-box` rule.
- **Responsive strategy**: Breakpoints follow Tailwind defaults (`sm:`, `lg:`). For example, `Layout.tsx` shows a desktop-only fixed sidebar (`hidden lg:flex`) and a mobile header with a hamburger menu (`lg:hidden`), plus a bottom tab bar only visible on small screens.
- **Iconography**: Icons are exclusively from `lucide-react` (e.g., `Shield`, `Menu`, `X`, `ClipboardList`, `CheckCircle`). They are sized via Tailwind utilities (`h-5 w-5`, `h-8 w-8`, etc.) and colored using token classes (`text-primary-600`, `text-gray-500`).
- **Component composition**: Pages are thin presentational layers composed of Tailwind utilities; reusable chrome (sidebar, navigation, auth guards) lives in `components/` (`Layout.tsx`, `AdminLayout.tsx`, `ProtectedRoute.tsx`, `AdminProtectedRoute.tsx`).
- **No scoped CSS modules / SCSS / styled-components**: There are no `.scss`, `.module.css`, or CSS-in-JS runtime stylesheets in the codebase.

## Conventions and Constraints Observed
- Brand colors must be referenced through the defined `--color-primary-*` tokens; ad-hoc color values are not used in the examined components.
- Semantic status colors are mapped to Tailwind utility combinations (e.g., `statusColors` table maps claim statuses to `bg-*-100 text-*-700` pairs).
- Interactive elements consistently apply focus states via `focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition`.
- Layouts use a consistent spacing scale (`p-4 sm:p-6 lg:p-8`, `gap-4`, `space-y-1`) and rounded corners (`rounded-lg`, `rounded-xl`, `rounded-2xl`).
- Typography hierarchy relies on Tailwind's default type scale (`text-xs` through `text-3xl`, `font-medium`/`font-semibold`/`font-bold`).
- The admin portal reuses the same token system but adds its own layout wrapper (`AdminLayout.tsx`) while keeping the same visual language.