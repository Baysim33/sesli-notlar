/*
# Add remind_at column to notes table

1. Modified Tables
- `notes`
- Add `remind_at` (timestamptz, nullable) — optional date/time for task reminders.
  When set, the note card displays an alarm icon and the reminder date prominently.
  NULL means no reminder is set.

2. Security
- No policy changes needed — existing CRUD policies on `notes` already allow
  full access to `anon` and `authenticated` for all columns.

3. Important Notes
- This is an additive change (new nullable column). No existing data is lost.
- The column is nullable so existing notes without reminders are unaffected.
*/

ALTER TABLE notes ADD COLUMN IF NOT EXISTS remind_at timestamptz;
