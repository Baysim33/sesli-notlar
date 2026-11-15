/*
# Add audio_url column to notes table

1. Modified Tables
- `notes`
- Add `audio_url` (text, nullable) — base64-encoded audio data URL for voice recordings.
  Stored directly as a data URL (data:audio/webm;base64,...) so it plays without external storage.
  NULL means no audio recording attached.

2. Security
- No policy changes needed — existing CRUD policies already allow full column access.

3. Important Notes
- Additive change (new nullable column). No existing data is lost.
*/

ALTER TABLE notes ADD COLUMN IF NOT EXISTS audio_url text;
