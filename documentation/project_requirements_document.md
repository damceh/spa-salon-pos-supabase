# Project Requirements Document (PRD)

## 1. Project Overview

We are building a modern, web-based Point of Sale (POS) and management system tailored for spa and salon businesses. The core of this system is a real-time Therapist Schedule Board that updates instantly as appointments are created, moved, or canceled. Alongside, a responsive POS interface enables staff to ring up services and products, process payments, and issue invoices—all in one seamless workflow. The application also includes a secure admin portal for managing therapists, services, products, and appointments, plus a data-driven analytics dashboard to track revenue and performance.

This solution solves the common challenges of manual scheduling, double-bookings, slow reporting, and fragmented payment processes. By leveraging Supabase for authentication, database, real-time subscriptions, and serverless functions, the system ensures live updates, robust data security, and easy integration with webhooks for third-party services (e.g., payment gateways, SMS reminders). Key success criteria include sub-second schedule updates across staff devices, under-two-second POS screen loads, zero double-bookings, and accurate daily sales reports.

---

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0):**
- Real-time Therapist Schedule Board with drag-and-drop rescheduling
- Responsive POS interface for services and product checkout
- Customer quick-registration and lookup
- Staff authentication via Supabase Auth and basic Role-Based Access Control (RBAC)
- Admin CMS for CRUD operations on therapists, services, products, and appointments
- Reports & analytics dashboard (daily bookings, revenue by service, therapist performance)
- Webhook system using Supabase Edge Functions (e.g., SMS reminders, payment confirmations)
- Toast notifications and command palette for quick actions
- Type-safe forms with React Hook Form and Zod

**Out-of-Scope (Phase 2+):**
- Offline-first or full PWA support with IndexedDB
- Native mobile apps (iOS/Android)
- Customer self-service booking portal
- Loyalty or membership management
- Multi-language/localization features
- Advanced accounting or ERP integrations
- In-depth accessibility (WCAG 2.1 AA) beyond basic keyboard navigation

---

## 3. User Flow

**Staff Scheduling & Booking:** A staff member logs in at the spa’s tablet or desktop and lands on the Dashboard, which defaults to the Therapist Schedule Board. They see a calendar view with therapists listed on the side and time slots across the top. To book or move an appointment, they drag an appointment card or click a free slot to open a booking modal. Within the modal, they search or quickly register a customer, select services or products, set time and therapist, then save. Instantly, Supabase Realtime pushes the new appointment to every connected client and updates the view.

**Point of Sale & Admin Tasks:** From the left-hand menu, staff can switch to the POS interface. Here they scan or select services/products, adjust quantities or discounts, and view a live invoice preview. After confirming the total, they choose a payment method and finalize the transaction. A receipt is displayed and optionally emailed. Managers log in with higher privileges, navigate to the Admin CMS section, and manage therapists, services, products, or view the Reports & Analytics dashboard. They can also configure webhooks and monitor logs.

---

## 4. Core Features

- **Real-time Therapist Schedule Board**: Drag-and-drop calendar, live updates via Supabase Realtime, status indicators for booked/available slots.
- **Responsive POS Interface**: Service/product selection, cart management, discount codes, payment processing, invoice generation.
- **Staff Authentication & RBAC**: Supabase Auth with JWT, role definitions (super admin, manager, receptionist), route/UI protection.
- **Admin CMS**: CRUD pages for therapists, services, products, appointments using React Hook Form + Zod, Shadcn/ui tables and dialogs.
- **Reports & Analytics**: Line/bar charts with Recharts, date filters, export to CSV or PDF.
- **Webhook Engine**: Supabase Edge Functions to send SMS/email reminders, receive payment gateway callbacks, configurable retry logic.
- **Notifications & Command Palette**: Sonner toaster notifications for feedback, command palette for quick navigation and actions.
- **Data Validation & Typing**: Zod schemas for runtime validation, TypeScript for static typing across API, hooks, and components.

---

## 5. Tech Stack & Tools

**Frontend:**
- React (with Vite)
- TypeScript
- Tailwind CSS
- Shadcn/ui component library
- Framer Motion for animations
- TanStack Query for data fetching & caching
- React Hook Form + Zod for form management & validation
- Recharts for data visualization
- dnd-kit for drag-and-drop
- Sonner for toast notifications

**Backend / Database:**
- Supabase
  - PostgreSQL (data storage)
  - Auth (JWT-based staff authentication)
  - Realtime (live subscriptions)
  - Storage (optional image/file storage)
  - Edge Functions (serverless webhook handlers)

**Tooling & IDE Integrations:**
- ESLint and Prettier (code quality)
- Vitest and React Testing Library (unit/integration tests)
- Environment variables (.env)

---

## 6. Non-Functional Requirements

- **Performance:**
  - Schedule board updates within 500 ms of database change
  - POS screens load under 2 seconds
- **Security:**
  - HTTPS for all front-end/back-end communications
  - JWT tokens stored securely (httpOnly cookies or secure local storage)
  - RBAC enforced on API and UI levels
- **Compliance:**
  - GDPR-ready (opt-in for customer data, data deletion requests)
  - PCI-DSS considerations for payment processing (do not store raw card data)
- **Usability:**
  - Responsive design for tablets (iPad) and desktops
  - Keyboard navigation and focus states for core workflows
  - Clear error messages and inline form validation

---

## 7. Constraints & Assumptions

- Supabase services (Realtime, Edge Functions) are available and performant in the target region
- Staff devices have stable internet connections; no offline mode in v1
- Roles and permissions definitions will be finalized before RBAC implementation
- Payment gateway choice supports webhook callbacks
- All data types and table schemas must be defined up front in Supabase
- No legacy data import tool is required for v1

---

## 8. Known Issues & Potential Pitfalls

- **Supabase Rate Limits:** High volume of realtime subscriptions may hit limits—consider channel aggregation or horizontal scaling.
- **Drag-and-Drop Complexity:** Calendar reordering edge cases (overnight shifts, overlapping appointments)—implement collision detection and user warnings.
- **Edge Function Cold Starts:** May introduce latency on the first request—keep functions lightweight or use warm-up pings.
- **Concurrent Updates:** Two staff might edit the same appointment simultaneously—use optimistic locking or provide conflict resolution UI.
- **CORS & Auth on Webhooks:** Ensure Edge Functions have proper CORS settings and verify payload signatures for security.


---

**This PRD serves as the single source of truth for subsequent technical documents (Tech Stack details, Frontend/Backend guidelines, App Flow diagrams, etc.).**