---
kind: frontend_style
name: Tailwind CSS v4 with Custom Design Tokens and Utility-First Styling
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/vite.config.ts
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/pages/DashboardPage.tsx
---

## System Overview

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) with a utility-first approach. There is no separate CSS framework or component library — styling is applied directly through Tailwind utility classes in JSX, with a small set of custom design tokens defined inline.

## Key Files and Packages

- `frontend/package.json` — declares `tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`, and `lucide-react: ^1.34.0` for icons.
- `frontend/src/index.css` — single global stylesheet that imports Tailwind via `@import "tailwindcss"` and defines the project's design token palette under `@theme`.
- `frontend/vite.config.ts` — registers the `@tailwindcss/vite` plugin; no additional CSS build pipeline.
- `frontend/src/components/Layout.tsx` — primary layout component demonstrating responsive sidebar, mobile bottom nav, and consistent use of theme tokens.
- All page components under `frontend/src/pages/*` apply styles exclusively via Tailwind class strings.

## Architecture and Conventions

### Design Tokens (`@theme`)
All colors are declared as CSS custom properties inside an `@theme` block in `index.css`, organized into semantic palettes:
- `--color-primary-{50..900}` — blue-based brand scale (50–900).
- `--color-danger-{50,500,600,700}` — red alert/error scale.
- `--color-success-{50,500,600}` — green confirmation scale.
- `--color-warning-{50,500,600}` — amber caution scale.

These tokens are consumed throughout the app using Tailwind's arbitrary color syntax (e.g., `text-primary-600`, `bg-primary-50`, `border-primary-600`). No other color values are used outside these palettes.

### Global Reset
A minimal reset is applied in `index.css`: system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`), antialiased text rendering, and `box-sizing: border-box` on all elements.

### Component-Level Styling
- Components are styled entirely with Tailwind utility classes passed as the `className` prop — no BEM, CSS Modules, or styled-components.
- Layouts use responsive breakpoints (`sm:`, `lg:`) to switch between desktop sidebar + main content and mobile top bar + bottom navigation.
- Iconography comes from `lucide-react`; icons are sized with Tailwind utilities (`h-5 w-5`, `h-8 w-8`) and colored via theme tokens.
- Interactive states use hover variants (`hover:bg-gray-100`, `hover:text-primary-700`) and transition utilities (`transition`, `transition-colors`).

### Responsive Strategy
- Mobile-first with breakpoint modifiers: `hidden lg:flex` hides desktop sidebar on small screens; `lg:hidden` hides mobile-only elements on large screens.
- Grid layouts adapt via `grid-cols-1 sm:grid-cols-3` patterns.
- Padding scales with `p-4 sm:p-6 lg:p-8`.

### Typography and Spacing
- Font sizes follow Tailwind defaults (`text-sm`, `text-lg`, `text-2xl`, `text-3xl`).
- Spacing uses Tailwind's standard scale (`gap-2`, `gap-3`, `gap-4`, `gap-8`, `mb-8`, `p-6`).
- Rounded corners consistently use `rounded-lg` and `rounded-xl`.

### Status / Semantic Colors
Page components map domain statuses to Tailwind color classes (e.g., `DashboardPage` maps `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED` to specific background/text pairs). This pattern centralizes status coloring per feature rather than relying solely on theme tokens.

## Constraints and Enforced Rules

- **No custom CSS files per component** — all styling lives in `index.css` (tokens/reset) and inline `className` strings within components.
- **Colors must come from the `@theme` palette** — the codebase does not define ad-hoc hex colors in components; brand and semantic colors are accessed only through the `primary-*`, `danger-*`, `success-*`, `warning-*` tokens.
- **Icons are sourced exclusively from `lucide-react`** — no SVG assets or icon fonts are referenced in components.
- **Responsive behavior is expressed via Tailwind breakpoint utilities** — no media queries are written manually; visibility toggles use `hidden lg:flex` / `lg:hidden` patterns.
- **Global box model is enforced via `* { box-sizing: border-box }`** — every element inherits this baseline.