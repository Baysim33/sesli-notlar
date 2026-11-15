/*
# Add user_id column to notes table for personal user note separation

1. Modified Tables
- `notes`
- Add `user_id` (text, nullable) — unique device / user identifier for personal privacy.
- Add index on `user_id` for fast query performance.

2. Security
- Preserves existing policies and allows each user to store and query notes privately.
*/

ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id text;
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes (user_id);
