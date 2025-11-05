# Backend Structure Document for Spa Salon POS

This document outlines the backend architecture, database setup, API design, hosting environment, infrastructure components, security measures, and monitoring strategies for the Spa Salon POS system built on Supabase. It’s designed to be clear and approachable, so you can understand how everything fits together without deep technical knowledge.

## 1. Backend Architecture

### Overview
The backend relies primarily on Supabase, a managed platform that includes a PostgreSQL database, authentication services, real-time subscriptions, storage, and serverless edge functions. This means there’s no separate server you have to maintain—Supabase handles the infrastructure, scaling, and high availability for you.

### Design Patterns and Frameworks
- **Serverless & Edge Functions**: Business logic (for webhooks, payment callbacks, custom workflows) runs in self-contained functions that scale automatically.
- **Event-Driven**: Real-time updates are powered by database triggers and Supabase’s real-time WebSocket layer. Whenever appointments or transactions change, connected clients get notified instantly.
- **Policy-Driven Access**: PostgreSQL Row-Level Security (RLS) policies enforce permissions at the database level, keeping your data safe and consistent.

### Scalability, Maintainability, Performance
- **Managed Scaling**: As your user base grows, Supabase automatically scales the database and edge functions—no manual intervention required.
- **Separation of Concerns**: Data storage, authentication, real-time streaming, and custom logic are each handled by dedicated Supabase modules, making it easy to locate, update, and troubleshoot code.
- **Low Latency**: Edge functions execute close to the user, and the real-time layer keeps data propagation under 100ms.

## 2. Database Management

### Technologies Used
- **Type**: Relational (SQL) database
- **System**: PostgreSQL (hosted by Supabase)

### Data Structuring and Storage
- **Normalized Tables**: Data is broken into logical tables (therapists, services, appointments, etc.) to reduce duplication.
- **Real-Time Triggers**: Built-in support for broadcasting INSERT, UPDATE, DELETE events to clients.
- **Storage Buckets**: Supabase Storage holds media files (therapist photos, product images) behind a global CDN.

### Data Access Practices
- **Supabase Client Library**: Simplifies queries, mutations, and subscriptions from the frontend.
- **Row-Level Security (RLS)**: Fine-grained policies ensure staff only read or write data they’re authorized to.
- **Migrations & Versioning**: Use the Supabase CLI or Studio to apply schema changes safely and track version history.

## 3. Database Schema

Below is a human-readable overview of the main entities and their relationships, followed by the actual SQL schema.

### Human-Readable Schema
- **Users & Roles**: Staff members with assigned roles (super_admin, manager, receptionist).
- **Therapists**: Profiles including name, contact info, picture stored in Supabase Storage.
- **Services**: Spa services, each with a name, description, price, and duration.
- **Products**: Retail items with inventory counts and pricing details.
- **Appointments**: Bookings linking a therapist to a service (and optionally products), with start/end times and status.
- **Transactions**: Payments tied to appointments, capturing amount, method, and status.
- **Webhook Logs**: Records of incoming/outgoing webhook events for auditing and retry logic.

### SQL Schema (PostgreSQL)
```sql
-- Roles Table
drop table if exists roles;
create table roles (
  id           serial       primary key,
  name         text         unique not null,
  created_at   timestamptz  default now(),
  updated_at   timestamptz  default now()
);

-- Users Table
drop table if exists users;
create table users (
  id              uuid         primary key default gen_random_uuid(),
  email           text         unique not null,
  role_id         integer      references roles(id),
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Therapists Table
drop table if exists therapists;
create table therapists (
  id              serial       primary key,
  name            text         not null,
  email           text         unique not null,
  profile_pic_url text,
  bio             text,
  active          boolean      default true,
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Services Table
drop table if exists services;
create table services (
  id              serial       primary key,
  name            text         not null,
  description     text,
  duration_min    integer      not null,
  price_cents     integer      not null,
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Products Table
drop table if exists products;
create table products (
  id              serial       primary key,
  name            text         not null,
  description     text,
  price_cents     integer      not null,
  inventory_count integer      default 0,
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Appointments Table
drop table if exists appointments;
create table appointments (
  id              serial       primary key,
  therapist_id    integer      references therapists(id),
  service_id      integer      references services(id),
  customer_name   text         not null,
  customer_phone  text,
  start_time      timestamptz  not null,
  end_time        timestamptz  not null,
  status          text         default 'booked',
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Transactions Table
drop table if exists transactions;
create table transactions (
  id              serial       primary key,
  appointment_id  integer      references appointments(id),
  amount_cents    integer      not null,
  payment_method  text         not null,
  status          text         default 'pending',
  created_at      timestamptz  default now(),
  updated_at      timestamptz  default now()
);

-- Webhook Logs Table
drop table if exists webhook_logs;
create table webhook_logs (
  id              serial       primary key,
  event_type      text         not null,
  payload         jsonb        not null,
  response_status integer,
  created_at      timestamptz  default now()
);
```  

## 4. API Design and Endpoints

### Approach
- **RESTful Endpoints** are auto-generated by Supabase for CRUD operations on every table.
- **Edge Function Endpoints** provide custom routes for webhooks, payment callbacks, and advanced workflows.

### Key Endpoints
- **/rest/v1/**
  - `GET /appointments`: List or filter appointments
  - `POST /appointments`: Create a new appointment
  - `PATCH /appointments?id=eq.<id>`: Update appointment details
  - `DELETE /appointments?id=eq.<id>`: Cancel an appointment
- **/functions/v1/** (Edge Functions)
  - `POST /functions/v1/send-sms`: Send SMS reminders when appointments are booked
  - `POST /functions/v1/payment-callback`: Handle incoming payment confirmations

### Communication Flow
1. The frontend calls the Supabase client to read/write data on `/rest/v1`.
2. Real-time subscriptions push changes over WebSockets.
3. Custom logic (notifications, third-party integrations) triggers Edge Functions via HTTP calls.

## 5. Hosting Solutions

- **Supabase Cloud**: Fully managed PostgreSQL, authentication, storage, real-time, and edge functions.
- **Global Edge Network**: Delivered via CDN, ensuring low latency worldwide.
- **Automatic Backups & Updates**: Supabase handles nightly backups, major and minor updates without downtime.

_Benefits_: reliability (99.99% SLA), seamless scalability, pay-as-you-go pricing, minimal operational overhead.

## 6. Infrastructure Components

- **Load Balancers**: Supabase transparently balances read/write traffic across database replicas.
- **Caching**: Built-in CDN for static assets (profile pictures, product images) and real-time cache invalidation.
- **Content Delivery Network (CDN)**: Supabase Storage uses a global CDN layer for fast asset delivery.
- **WebSocket Layer**: Real-time events flow over a dedicated WebSocket network managed by Supabase.

These components ensure fast page loads, instant data updates, and high throughput under load.

## 7. Security Measures

- **Authentication**: Supabase Auth provides email/password login, JWT tokens, social logins.
- **Authorization**: Role-based Access Control (RBAC) defined via PostgreSQL RLS policies.
- **Data Encryption**: All data is encrypted in transit (TLS) and at rest (AES-256).
- **Environment Secrets**: API keys and private salts are stored securely in Supabase project settings.
- **Webhook Verification**: HMAC signatures verify incoming webhook payloads.

These layers protect user data, comply with GDPR/PCI DSS standards, and prevent unauthorized access.

## 8. Monitoring and Maintenance

- **Supabase Dashboard**: Built-in metrics for query performance, error rates, and function invocations.
- **Logs & Alerts**: Automatic capture of database logs, real-time event logs, and Edge Function traces.
- **Backup & Recovery**: Automated daily backups with point-in-time recovery.
- **Schema Migrations**: Managed via Supabase CLI, ensuring zero-downtime deploys.
- **Uptime Monitoring**: Third-party tools (e.g., UptimeRobot) can ping critical endpoints.

Regular maintenance tasks include reviewing slow queries, pruning webhook_logs, and updating RLS policies as requirements evolve.

## 9. Conclusion and Overall Backend Summary

The Spa Salon POS backend leverages Supabase’s managed services to deliver a scalable, secure, and real-time system. Key components include a PostgreSQL database with RLS policies, serverless edge functions for custom workflows, automatic backups, and a global CDN for media assets. By using this architecture, you gain:

- **Instant Real-Time Updates** for the Therapist Schedule Board.
- **Built-In Authentication & RBAC** for secure staff access.
- **Easy File Storage** behind a CDN.
- **Custom Webhook Capabilities** for third-party integrations.
- **Minimal Ops Overhead**, letting you focus on building business logic.

This setup aligns closely with your project goals, providing a stable, performant, and extensible backend foundation for your spa and salon management system.