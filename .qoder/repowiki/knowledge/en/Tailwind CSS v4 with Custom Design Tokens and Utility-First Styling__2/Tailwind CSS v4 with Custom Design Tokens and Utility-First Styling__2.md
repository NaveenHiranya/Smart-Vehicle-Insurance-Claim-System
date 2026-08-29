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
---

## What system/approach is used

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) in a utility-first approach, configured through Vite. There is no separate `tailwind.config.js` file — Tailwind v4's new configuration model is used instead, with design tokens declared directly in the global stylesheet via the `@theme` directive. Icons are provided by **Lucide React** (`lucide-react`). No component UI library (e.g., shadcn, MUI, AntD) is used; all components are built from scratch using Tailwind utility classes.

## Key files and packages

- `frontend/package.json` — declares `tailwindcss ^4.3.3`, `@tailwindcss/vite ^4.3.3`, `lucide-react ^1.34.0`, plus React, axios, react-router-dom, react-dropzone.
- `frontend/src/index.css` — single source of styling: imports Tailwind via `@import "tailwindcss"`, defines custom design tokens under `@theme`, sets base body font stack and box-sizing reset.
- `frontend/vite.config.ts` — registers `react()` and `tailwindcss()` plugins, configures dev server proxy for `/api` and `/uploads` to the backend.
- `frontend/src/components/Layout.tsx` — representative example of how utilities are composed into layout, navigation, and responsive patterns.

## Architecture and conventions

### Design tokens
All visual tokens live in `src/index.css` inside an `@theme` block:
- A blue semantic palette `--color-primary-*` (50–900).
- Semantic status palettes: `danger-*`, `success-*`, `warning-*` (each with light and saturated variants).
These tokens are consumed throughout the app as Tailwind color utilities (e.g., `text-primary-600`, `bg-primary-50`, `text-danger-700`).

### Base styles
A minimal global reset is applied in `index.css`:
- System font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` for crisp text rendering.
- Universal `box-sizing: border-box`.

### Component styling pattern
Components are styled inline with Tailwind utility classes — there are no per-component CSS/SCSS files. Layouts compose spacing, colors, borders, and typography utilities directly on JSX elements. For example, `Layout.tsx` uses `min-h-screen bg-gray-50 flex`, `lg:flex lg:w-64`, `px-3 py-2.5 rounded-lg`, etc.

### Responsive strategy
Responsive breakpoints follow Tailwind defaults (`sm:`, `md:`, `lg:`). The `Layout` component demonstrates a common pattern: a desktop sidebar (`hidden lg:flex`) paired with a mobile header + overlay sidebar (`lg:hidden fixed inset-0`) and a bottom tab bar for small screens. This establishes a consistent multi-role layout across user/garage/admin portals.

### Iconography
Icons come exclusively from `lucide-react` (e.g., `Shield`, `LayoutDashboard`, `Car`, `FileText`, `ClipboardList`, `User`, `LogOut`, `Menu`, `X`). They are sized with Tailwind utilities like `h-5 w-5`, `h-8 w-8`, `h-7 w-7`. No SVG sprites or icon fonts are used.

### Build-time integration
Tailwind is integrated via the `@tailwindcss/vite` plugin rather than the traditional PostCSS pipeline. This means CSS processing happens during Vite's build, and the `@theme` token declarations are picked up automatically without a config file.

## Conventions and constraints

- **No custom CSS modules / SCSS**: All styling is done through Tailwind utility classes in JSX; no `.scss`, `.module.css`, or per-component style files exist.
- **Design tokens are centralized**: New colors must be added to the `@theme` block in `src/index.css` and referenced via `text-{token}`, `bg-{token}`, `border-{token}` utilities — ad-hoc hex values should be avoided in favor of the defined semantic palettes.
- **Semantic color usage**: Primary actions use the `primary-*` scale; status feedback uses `danger-*`, `success-*`, `warning-*`; neutral surfaces/text use Tailwind's built-in gray scale.
- **Responsive-first layouts**: Components consistently hide/show sections with `hidden lg:flex` / `lg:hidden` patterns rather than media queries, keeping responsiveness declarative in markup.
- **Icon sizing convention**: Icons are sized via Tailwind `h-* w-*` utilities (typically `h-5 w-5` for inline, larger for headers/logos), never via CSS classes.
- **Base typography**: All text inherits the system font stack defined in `index.css`; no custom font families are imported.