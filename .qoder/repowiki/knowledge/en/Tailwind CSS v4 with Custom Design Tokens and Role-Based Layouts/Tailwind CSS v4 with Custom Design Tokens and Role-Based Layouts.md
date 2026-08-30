---
kind: frontend_style
name: Tailwind CSS v4 with Custom Design Tokens and Role-Based Layouts
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/src/index.css
    - frontend/package.json
    - frontend/src/components/Layout.tsx
    - frontend/src/components/AdminLayout.tsx
    - frontend/src/components/GarageLayout.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/App.tsx
---

## Styling System

The frontend is a React + Vite SPA styled exclusively with **Tailwind CSS v4** (no Sass/Less, no CSS-in-JS). There is no `tailwind.config.js`; configuration lives in the single global stylesheet `frontend/src/index.css`, which uses Tailwind's new `@theme` directive to declare design tokens.

### Design Tokens (`index.css`)
- A cohesive blue primary palette (`--color-primary-50` through `--color-primary-900`) drives branding across all three portals.
- Semantic semantic color tokens are defined for status feedback: `danger-*` (red), `success-*` (green), `warning-*` (amber).
- A custom `float` keyframe animation (`--animate-float`) is registered for subtle motion on hero/illustration elements.
- Global typography defaults to the system font stack (`system-ui, -apple-system, BlinkMacFont, 'Segoe UI', Roboto, sans-serif`) with antialiased text rendering.
- A reset sets `box-sizing: border-box` globally and zeroes body margins.

### Component Library & Icons
- No UI component library (no shadcn, MUI, AntD, etc.). All components are hand-built using Tailwind utility classes.
- Icons come from **lucide-react**, imported per-component (e.g. `Shield`, `LayoutDashboard`, `Car`, `FileText`, `ClipboardList`, `User`, `LogOut`, `Menu`, `X`, `AlertCircle`, `Lock`, `Wrench`, `Mail`, `ArrowRight`).
- Brand assets live under `src/assets/` (hero image, React/Vite SVGs) and static SVGs in `public/` (`favicon.svg`, `icons.svg`).

### Layout Architecture
Three role-based layout components provide consistent chrome:
- **`Layout.tsx`** — policyholder portal: light sidebar (`bg-white`, `border-r border-gray-100`) with gradient logo tiles (`from-primary-600 to-primary-800`), active-state gradients (`from-primary-600 to-primary-500`), mobile responsive top bar + bottom tab nav, backdrop-blur header, and a fixed `GlobalAIAssistant` floating widget.
- **`AdminLayout.tsx`** — admin panel: dark sidebar (`bg-gray-900`, `text-gray-400`), collapsible sidebar toggled via state, active items highlighted with `bg-primary-600 text-white`, user info footer, and a main area with `overflow-x-auto`.
- **`GarageLayout.tsx`** — garage portal: dark sidebar similar to admin but with orange accent (`orange-600` active state, `orange-400` icon) to visually distinguish the garage role.

All layouts use Tailwind responsive breakpoints (`sm:`, `lg:`) to switch between desktop sidebars and mobile drawer/bottom-nav patterns.

### Page-Level Styling Conventions
Pages compose layouts and style themselves purely with Tailwind utilities:
- Forms use rounded inputs (`rounded-xl`), subtle borders (`border-gray-200`), focus rings (`focus:ring-4 focus:ring-primary-500/10`), and inline icons via absolute positioning.
- Cards and containers rely on spacing scale (`p-4 sm:p-6 lg:p-8`, `space-y-4`, `gap-3`) and soft backgrounds (`bg-gray-50`, `bg-gray-50/80`).
- Status/alert banners follow the semantic token pattern: `border-danger-500/20 bg-danger-50 text-danger-700`.
- Buttons use gradient fills (`bg-gradient-to-r from-primary-600 to-primary-700`) with matching shadows (`shadow-lg shadow-primary-600/25`) and hover states.
- Grid-based auth pages split into a branded left panel (`AuthBrandPanel`) and scrollable form panel on the right (`grid min-h-dvh lg:grid-cols-2`).

### Responsive Strategy
- Mobile-first with breakpoint-driven overrides (`hidden lg:flex` for desktop-only sidebar, `lg:hidden` for mobile-only controls).
- The policyholder layout provides both a top-bar hamburger menu and a fixed bottom tab bar on small screens; admin/garage layouts keep a persistent sidebar.
- Content padding scales with breakpoints (`p-4 sm:p-6 lg:p-8`).

### Build & Tooling
- Tailwind v4 is loaded via `@import "tailwindcss"` in `index.css` (the new zero-config import).
- Vite is the dev/build server; TypeScript compiles alongside (`tsc -b && vite build`).
- Linting is handled by oxlint (`oxlint` script); no CSS-specific linter is configured.