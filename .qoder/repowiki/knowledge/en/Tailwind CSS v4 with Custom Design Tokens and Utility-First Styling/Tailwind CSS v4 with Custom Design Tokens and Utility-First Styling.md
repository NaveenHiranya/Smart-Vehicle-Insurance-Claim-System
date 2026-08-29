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

The frontend uses **Tailwind CSS v4** (via `@tailwindcss/vite` plugin in Vite) with a utility-first styling approach. There are no custom CSS frameworks, component libraries for UI elements, or SCSS/Sass preprocessing — styling is applied directly through Tailwind utility classes in JSX `className` attributes. Icons come from the `lucide-react` package.

## Key files and packages

- `frontend/src/index.css` — single global stylesheet that imports Tailwind and declares design tokens via the `@theme` block
- `frontend/vite.config.ts` — registers the `@tailwindcss/vite` plugin and configures dev server proxying
- `frontend/package.json` — lists `tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`, and `lucide-react: ^1.34.0` as dependencies
- `frontend/src/components/Layout.tsx` — representative example of utility-first styling throughout the app (sidebar, responsive breakpoints, color usage)

## Architecture and conventions

### Design tokens
All brand colors are defined as semantic CSS custom properties under `--color-*` in the `@theme` block in `index.css`. The token set includes:
- **Primary palette**: `primary-50` through `primary-900` (blue tones), with `primary-600` used as the main brand color
- **Semantic palettes**: `danger-50/500/600/700` (red), `success-50/500/600` (green), `warning-50/500/600` (amber)

These tokens are consumed via Tailwind's arbitrary value syntax (e.g., `text-primary-600`, `bg-primary-50`) rather than named class aliases.

### Global reset
A minimal reset is applied: `body` sets font stack to `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` with antialiasing enabled; `* { box-sizing: border-box }` ensures consistent sizing.

### Responsive strategy
Responsive behavior is handled entirely through Tailwind's built-in breakpoints (`sm:`, `lg:`) within utility classes. For example, the sidebar layout switches between a fixed desktop sidebar (`hidden lg:flex`) and a mobile-only hamburger menu with overlay (`lg:hidden`). A bottom tab bar appears only on mobile (`lg:hidden`).

### Component-level styling
Components compose layout using flexbox utilities (`flex`, `min-h-screen`, `flex-col`, `space-y-*`, `gap-*`) and spacing via Tailwind's spacing scale. No scoped CSS modules, CSS-in-JS, or styled-components are used.

### Iconography
Icons are imported from `lucide-react` and rendered inline with size utilities (e.g., `h-5 w-5`, `h-8 w-8`), keeping visual consistency across the navigation and pages.

## Conventions and constraints

- **No separate CSS files per component** — all styling lives in `index.css` (tokens + reset) and utility classes inline in JSX.
- **Brand colors must use the defined `primary-*` tokens** — components reference `primary-600` for branding and `primary-50`/`primary-700` for active states instead of hard-coded hex values.
- **Semantic colors are preferred over raw hues** — status feedback uses `danger-*`, `success-*`, `warning-*` tokens rather than direct red/green/amber classes.
- **Responsive patterns follow Tailwind's mobile-first breakpoints** — `hidden lg:flex` / `lg:hidden` toggles are used consistently for sidebar visibility.
- **Typography defaults to the system font stack** — no custom fonts are loaded; text styling relies on Tailwind's `font-bold`, `text-sm`, `text-xs`, etc.
- **Spacing and sizing use Tailwind's standard scale** — margins, padding, widths, and heights are expressed via utility classes (e.g., `p-4 sm:p-6 lg:p-8`, `w-64`, `h-full`).
- **No Tailwind configuration file** — customization is done exclusively through the `@theme` block in `index.css`; there is no `tailwind.config.js`.