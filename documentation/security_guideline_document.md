# Security Guidelines for Spa Salon POS with Supabase

This document describes security best practices and specific implementation recommendations for the `spa-salon-pos-supabase` codebase. It aligns with core security principles (Security-by-Design, Least Privilege, Defense in Depth, Fail Securely, etc.) and addresses authentication, data handling, infrastructure, and more.

---

## 1. Authentication & Access Control

• **Supabase Auth Hardening**  
  – Enforce strong password policies (minimum 12 characters, uppercase, lowercase, digits, symbols).  
  – Rely on Supabase’s built-in hashing (bcrypt) with unique salts.  
  – Rotate and revoke API keys regularly; store them only in secure environment variables.  

• **Session Management**  
  – Use HttpOnly, Secure, SameSite=Strict cookies for session tokens.  
  – Implement both idle (e.g., 15 min) and absolute (e.g., 8 h) timeouts.  
  – Invalidate sessions on logout or role change.  

• **JWT & RLS**  
  – Verify token signatures (HS256 or RS256), `exp`, `aud`, and `iss` claims on every request.  
  – Leverage Supabase Row-Level Security (RLS) policies to restrict data access to the owner or role.  
  – Use custom JWT claims or a `roles` table (`super_admin`, `manager`, `receptionist`) for fine-grained RBAC.  

• **Role-Based Access Control (RBAC)**  
  – Define UI and API route guards based on user roles.  
  – Deny by default; explicitly grant `SELECT`, `INSERT`, `UPDATE`, `DELETE` rights per table and per role.  
  – Enforce server-side authorization checks in Next.js `getServerSideProps` and API routes.  

• **Multi-Factor Authentication (MFA)** (optional enhancement)  
  – Offer TOTP or SMS-based second factors for sensitive roles.  

---

## 2. Input Handling & Processing

• **Strong Validation with Zod**  
  – Define Zod schemas for all forms (customer registration, booking, checkout, CRUD in Admin CMS).  
  – Validate on both client and server/Edge Function boundaries to prevent bypass.  

• **Prevent Injection Attacks**  
  – Supabase client uses parameterized queries under the hood; never build raw SQL with string concatenation.  
  – Sanitize free-text fields to disallow dangerous characters or patterns if forwarded to logs/notifications.  

• **Cross-Site Scripting (XSS) & Template Safety**  
  – Escape or sanitize any user-provided text before rendering inside React components.  
  – Disable `dangerouslySetInnerHTML` unless content is strictly sanitized.  

• **Secure File Uploads**  
  – Validate file type, extension, and size in both React Hook Form and the Supabase Storage Edge Function.  
  – Store uploads outside the public webroot and serve via signed URLs.  
  – Scan uploads for malware if applicable.  

---

## 3. Data Protection & Privacy

• **Encryption in Transit & At Rest**  
  – Enforce TLS 1.2+ across Next.js server, API routes, and Supabase endpoints.  
  – Supabase automatically encrypts data at rest; verify in project settings.  

• **Secret Management**  
  – Do not commit `.env` files.  
  – Use managed secrets (Vercel Environment Variables, GitHub Secrets, or Vault) for Supabase keys, third-party API tokens.  

• **Information Leakage Prevention**  
  – Customize Next.js error handlers to avoid stack traces in production.  
  – Mask or redact PII (e.g., phone numbers, email addresses) in logs and webhook payloads.  

• **Database Connection Security**  
  – Use least-privileged database roles in Supabase for your Edge Functions and API routes.  
  – Rotate DB credentials periodically.  

---

## 4. API & Service Security

• **HTTPS & HSTS**  
  – Serve all traffic over HTTPS.  
  – Set `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.  

• **CORS**  
  – Restrict allowed origins to your frontend domain(s).  
  – Whitelist only necessary methods (`GET`, `POST`, `PUT`, `DELETE`).  

• **Rate Limiting & Throttling**  
  – Implement rate limits in Next.js API routes or use a middleware (e.g., `rate-limiter-flexible`) to block brute-force attempts on login or webhook endpoints.  

• **API Input Validation**  
  – Use Zod to validate incoming JSON in Edge Functions or custom API handlers.  

• **API Versioning**  
  – Prefix API routes with `/api/v1/…` to facilitate safe, incremental changes.  

---

## 5. Web Application Security Hygiene

• **Anti-CSRF**  
  – Use Next.js built-in CSRF protection for form submissions (e.g., `next-csrf`) or protect state-changing endpoints with same-site cookies and/or synchronizer tokens.  

• **Security Headers**  
  – Content-Security-Policy: restrict scripts/styles to self and trusted CDNs.  
  – X-Frame-Options: `DENY`.  
  – X-Content-Type-Options: `nosniff`.  
  – Referrer-Policy: `strict-origin-when-cross-origin`.  

• **Cookie Security**  
  – Set `Secure`, `HttpOnly`, `SameSite=Strict` on auth/session cookies.  

• **Client-Side Storage**  
  – Avoid storing tokens or PII in `localStorage` or `sessionStorage`; use HttpOnly cookies.  

• **Subresource Integrity (SRI)**  
  – When loading external scripts/styles, include SRI hashes to guarantee integrity.  

---

## 6. Infrastructure & Configuration Management

• **Server Hardening**  
  – On Vercel/Netlify/AWS: disable SSH, remove default credentials, and close unused ports.  

• **Environment Separation**  
  – Maintain distinct environments for development, staging, and production with separate credentials and feature flags.  

• **Automated Updates**  
  – Regularly update Next.js, React, Supabase SDK, Tailwind, and other dependencies.  
  
• **Disable Debug in Prod**  
  – Ensure `NODE_ENV = production`, remove debug/logging middleware or verbose stack traces.  

---

## 7. Dependency Management

• **Secure Dependency Vetting**  
  – Use lockfiles (`package-lock.json`) and an SCA tool (e.g., `npm audit`, `Snyk`, or `Dependabot`) to detect vulnerabilities.  
  
• **Keep Footprint Minimal**  
  – Only install required libraries; periodically review and remove unused packages.  

• **Regular Audits & Updates**  
  – Automate dependency updates and test coverage to ensure compatibility.  

---

## Conclusion & Next Steps

By following these guidelines, you will ensure that the Spa Salon POS system is protected against common threats while preserving performance and developer productivity. Prioritize the implementation of RBAC, input validation, and secure session handling early. Conduct regular security reviews and penetration tests as the system evolves.