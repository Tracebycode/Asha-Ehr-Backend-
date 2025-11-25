ASHA Backend Architecture

1. Supabase PostgreSQL
   - Data storage
   - RLS for access control
   - All business rules enforced at DB

2. Node.js Edge Functions
   - /sync/bulk
   - /tasks/assign
   - /health_records/verify
   - /dashboard/summary
   - /auth/login (optional)
   These run securely with service_role key.

3. Flutter App (ASHA)
   - Local SQLite offline DB
   - Sync queue
   - Sync → Edge Function → Supabase

4. Web Dashboard (PHC + ANM)
   - Supabase client (read)
   - Edge functions for admin tasks
