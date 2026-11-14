/*
# Create notes table (single-tenant, no auth)

1. New Tables
- `notes`
- `id` (uuid, primary key)
- `title` (text, not null) — note title
- `content` (text, not null) — note body
- `category` (text, not null) — one of: 'Ders', 'Teknik', 'Görevler', 'Genel'
- `image_url` (text, nullable) — optional image reference for photo notes
- `source` (text, not null default 'manual') — 'manual', 'photo', 'voice'
- `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `notes`.
- Grant CRUD to `anon` + `authenticated` so the Data API can reach the table.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (single-tenant, no sign-in).

3. Indexes
- Index on `created_at` descending for list queries.
- Index on `category` for filter queries.
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('Ders', 'Teknik', 'Görevler', 'Genel')),
  image_url text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes (category);
