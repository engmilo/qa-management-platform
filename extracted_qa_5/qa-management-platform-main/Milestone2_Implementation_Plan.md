# Milestone 2: Project Setup, UI Foundation & Authentication

## Task Overview
Milestone 2 constructs the development foundation: project scaffolding, TypeScript type safety, UI component libraries, authentication flows, and responsive dashboard skeleton.

## Part 1: Scaffold Project with Manual Setup

Due to offline registry constraints, initialize a new Next.js application via `npm init` and manually configure required files. Once network is available, production setup will use `npx create-next-app` with flags below:

```
npx create-next-app@latest qa-platform \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm \
  --yes
```

For offline progress, we create initial project structure with:

```
qa-platform/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── common/
│   ├── lib/
│   │   └── supabase/
│   └── types/
```

## Part 2: Configuration Files

**tsconfig.json** (TypeScript path aliases, strict mode)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**tailwind.config.ts** (Dark navy and neutral palette per design brief)
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0F1C",
        foreground: "#E8ECF4",
        primary: {
          DEFAULT: "#1B3A6B",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#2D3748",
          foreground: "#E8ECF4",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#8B9BB8",
        }
      }
    },
  },
  plugins: [],
};
export default config;
```

**postcss.config.js**
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Part 3: Supabase Authentication Integration

### Supabase Client Setup
File: `src/lib/supabase/client.ts`

Initialize Supabase client for both server and client contexts. Uses environment variables for URL and anon key—no service role exposure.

## Part 4: Supabase Auth UX Flows

- **Login**: Email/password login screen (`/auth/login`) with form validation (zod).
- **Register / Onboarding**: `/auth/register` → create user profile → prompt to create/join an organization → redirect to dashboard.
- **Forgot Password**: `/auth/reset-password` flow with email verification & token validation.
- **Session Management**: Next.js middleware enforces auth redirects for protected `(dashboard)` routes.

## Part 5: Core UI Component Foundation

Install shadcn/ui primitives for:
- Buttons, Inputs, Forms, Dialogs, Dropdown Menus, Tooltips
- Tables with sorting & filtering
- Sidebars, Navbars, Breadcrumbs
- Cards for dashboard metrics

## Part 6: Dashboard Skeleton Structure

Create responsive shell:
- App-wide Header: organization switcher, global search placeholder, user profile menu, notifications
- Sidebar Navigation: Dashboard, Projects, Requirements, Test Cases, Test Plans, Test Execution, Defects, Traceability, Reports, AI Assistant, Settings
- Layout with desktop and tablet breakpoints per design brief.

## Part 7: Database Seed Initial Dataset

Use `supabase_schema.sql` for full schema. Seed with:

- One organization: `Acme QA Labs`
- Profiles for test roles: QA Manager, QA Engineer, Developer
- Projects: `Mobile Banking App`, `E-Commerce Platform`
- Seed requirements, test cases, and a test plan for MVP validation.

## Part 8: Development Scripts

- `npm run dev` → Next.js dev server (Turbopack)
- `npm run build` → production build
- `npm run lint` → ESLint
- `npm run type-check` → TypeScript compiler

## Acceptance Criteria

1. Clean `npm start` launches Next.js dev server locally without errors.
2. Supabase auth flows (login, register, reset password) complete successfully.
3. Protected routes redirect unauthenticated users to `/auth/login`.
4. UI foundation renders with navy/neutral palette, responsive sidebar + header.
5. Supabase schema is deployed to dev project and RLS policies are active.
6. Seed data visible in Supabase Studio (organizations, projects, requirements, test cases).

## Next Steps
Milestone 2 establishes foundation for Milestone 3 (Multi-Tenant Organization Management & RBAC).
