-- Hotfix: ensure document download rows are removed automatically when a document is deleted.
-- Safe to run multiple times.
-- Note:
--   - comments.post_id already uses ON DELETE CASCADE in supabase/schema.sql
--   - shares.post_id already uses ON DELETE CASCADE in supabase/schema.sql
--   - likes.target_id is polymorphic (post/comment), so it cannot be safely converted to a single FK cascade here

alter table if exists public.document_downloads
  drop constraint if exists document_downloads_document_id_fkey;

alter table if exists public.document_downloads
  add constraint document_downloads_document_id_fkey
  foreign key (document_id)
  references public.documents(id)
  on delete cascade;
