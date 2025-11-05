flowchart TD
  A[Login] --> B[Dashboard]
  B --> C[Therapist Schedule Board]
  C --> D[Open Booking Modal]
  D --> E[Submit Booking]
  E --> F[Supabase Insert]
  F --> G[Realtime Subscription]
  G --> C
  B --> H[POS Interface]
  H --> I[Select Services Products]
  I --> J[Review Cart]
  J --> K[Process Payment]
  K --> L[Generate Transaction]
  L --> G
  B --> M[Admin CMS]
  M --> N[Manage Therapists]
  M --> O[Manage Services]
  M --> P[Manage Products]
  M --> Q[Manage Appointments]