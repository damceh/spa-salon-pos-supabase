# Frontend Guideline Document

This document outlines the frontend setup for the Spa Salon POS starter template. It explains how the code is organized, which tools and libraries are used, and the guiding principles behind each choice. Anyone—even without a deep technical background—should be able to understand how the frontend works and how to extend it.

## 1. Frontend Architecture

**Core Frameworks & Tools**
- **Vite + React + TypeScript**: A fast build tool (Vite) combined with React gives us a component-based UI using modern JavaScript and strict type checking.
- **Tailwind CSS**: A utility-first CSS framework for rapid and consistent styling without writing large CSS files.
- **Shadcn/ui**: A collection of pre-built, fully ownable React components (Table, Dialog, Card, Calendar) that work seamlessly with Tailwind.
- **Framer Motion**: A lightweight library for smooth animations and transitions.
- **TanStack Query**: Handles data fetching and caching, keeping UI in sync with the backend in real time.
- **React Hook Form + Zod**: Manages form state and validation in a type-safe way.
- **Supabase Client**: Communicates with the Supabase backend for database, auth, real-time updates, storage, and edge functions.
- **Recharts**: A simple, customizable charting library for reports and analytics.
- **Sonner**: A tiny toast notification library for instant feedback.

**How It All Fits Together**
- **Components** (React + Shadcn/ui) form the building blocks of every screen.
- **Data Fetching** goes through TanStack Query, which uses the Supabase client under the hood.
- **Forms** leverage React Hook Form & Zod for quick setup and reliable validation.
- **Real-Time Updates** are powered by Supabase Realtime—any change in the appointments table pushes instantly to all connected clients.
- **Routing** (React Router) manages which component shows based on the URL.

This modular setup scales naturally: as you add new screens or features, you just drop in new components, hooks, and routes without cluttering existing code. Using TypeScript and strictly typed APIs ensures fewer runtime bugs.

## 2. Design Principles

1. **Usability**  
   Straightforward interfaces with clear labels, intuitive controls (drag-and-drop scheduling, simple modals), and immediate feedback (toasts).

2. **Accessibility**  
   - Keyboard navigation (focus states, skip links).  
   - ARIA attributes on custom components.  
   - Sufficient color contrast for readability.

3. **Responsiveness**  
   - Mobile-first layouts using Tailwind’s responsive utilities.  
   - Touch-friendly elements for tablets.

4. **Consistency**  
   - Common component library (Shadcn/ui) ensures uniform look and behavior.  
   - Shared design tokens (spacing, colors, fonts) reduce visual drift.

5. **Performance-First UX**  
   - Optimistic updates and loading states via TanStack Query to keep the interface feeling snappy.

## 3. Styling and Theming

**Styling Approach**
- **Tailwind CSS**: Apply utility classes directly in JSX for margin, padding, typography, colors, etc.
- **CSS Custom Properties**: Where dynamic theming is needed (e.g., light/dark mode), Tailwind’s CSS variables are toggled via a React context.

**Design Style**
- **Modern Flat Design** with subtle **glassmorphism** touches on modals and dialogs (semi-transparent backgrounds, soft shadows).
- **Minimalist, Clean Layouts** to keep focus on scheduling and checkout workflows.

**Color Palette**
- Primary Teal: #4FBEAB  
- Secondary Green: #7FD1B9  
- Accent Peach: #FBE7C6  
- Neutral Light: #F6F5F3  
- Neutral Dark: #1E1E1E

**Fonts**
- **Inter** (system-friendly, highly legible) for body text and inputs.
- **Poppins** for headings (friendly, rounded feel that matches spa branding).

## 4. Component Structure

**Folder Organization**
```
src/
├─ components/          # Reusable UI pieces (buttons, inputs, cards)
├─ features/            # Domain areas (appointments, pos, cms, reports)
│   ├─ appointments/    # Schedule board, hooks, types
│   ├─ pos/             # Checkout flow, product selector
│   ├─ cms/             # Admin CRUD interfaces
│   └─ reports/         # Chart components, filters
├─ hooks/               # Custom hooks (useAppointments, useServices)
├─ lib/                 # Utility functions (currency formatting)
├─ styles/              # Tailwind config, global CSS
└─ App.tsx              # Root component with router & providers
```

**Component-Based Benefits**
- **Reusability**: Build once, use everywhere (e.g., the same `Dialog` for bookings and confirmations).
- **Isolation**: Each component manages its own logic and styles, reducing side effects.
- **Testability**: Small, focused components are easier to unit-test.

## 5. State Management

1. **Server State**: TanStack Query handles all data from Supabase (appointments, services, products, reports). It caches results, deduplicates requests, and provides hooks (`useQuery`, `useMutation`) with loading/error states.
2. **Local/UI State**: React’s built-in `useState` and `useReducer` manage UI flags (open/closed dialogs, theme toggle).
3. **Global UI Context**: A simple React Context stores global settings like current theme, authenticated user, and permissions.

This separation ensures that network-driven data and purely UI-driven state don’t tangle, making the code easier to reason about.

## 6. Routing and Navigation

- **React Router v6** defines routes in `App.tsx`:
  - **Public Routes**: `/login`, `/auth/*`
  - **Protected Routes**: `/dashboard`, `/appointments`, `/pos`, `/cms`, `/reports`
- **Layout Components** wrap groups of routes, providing a persistent sidebar or header.
- **Route Guards** check user roles (via Supabase Auth JWT claims) and redirect unauthorized users to a “Not Authorized” page.
- **Breadcrumbs & Nav Links** give visual context of where you are and quick access to other sections.

## 7. Performance Optimization

- **Code Splitting**: Dynamic `import()` for feature modules and routes so users only download code they need.
- **Lazy Loading**: React’s `lazy` + `Suspense` for heavy components (charts, large dialogs).
- **Image Optimization**: Serve compressed images from Supabase Storage; use `<img loading="lazy">`.
- **Asset Minification**: Vite builds automatically compress JS/CSS; Tailwind’s purge removes unused styles.
- **Optimistic Updates**: TanStack Query updates the UI immediately on mutations, then rolls back if the request fails.
- **Debouncing**: Input searches (e.g., product search) debounce user typing to reduce API calls.

## 8. Testing and Quality Assurance

- **Unit Tests**: Vitest + React Testing Library for individual components and hooks (e.g., `useAppointments`).
- **Integration Tests**: Test forms and data flows (booking → mutation → schedule update).
- **End-to-End Tests**: Cypress (or Playwright) scripts simulate user journeys: login, make a booking, complete a sale.
- **Linting & Formatting**: ESLint and Prettier enforce consistent code style. Hooks rules ensure side effects and dependencies are correct.
- **Type Checking**: TypeScript compiler runs on every commit/CI to catch type errors early.

## 9. Conclusion and Overall Frontend Summary

This frontend setup provides a modern, scalable foundation for your Spa Salon POS:
- A clear **component-based** architecture ensures each piece of UI is isolated and reusable.
- **Tailwind + Shadcn/ui** speed up development while keeping a consistent look and feel.
- **Supabase** integration (auth, realtime, database, functions) powers mission-critical features like live schedule updates and secure role-based access.
- **TanStack Query** delivers a snappy UX by managing server state effortlessly.
- **Testing**, **linting**, and **type checking** safeguard code quality as the project grows.

Together, these guidelines form a roadmap for extending and maintaining the POS interface, therapist schedule board, and admin CMS. With this in place, your team can focus on building the unique features that differentiate your salon management system, confident that the core frontend foundation is solid, performant, and easy to work with.