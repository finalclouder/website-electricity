-- Hotfix: create the missing social graph tables used by follow/friend/notification/download features.
-- Safe to run multiple times.

create table if not exists public.user_follows (
  follower_id text not null references public.users(id) on delete cascade,
  following_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_user_follows_following_id
  on public.user_follows(following_id);

create table if not exists public.friend_requests (
  id text primary key,
  sender_id text not null references public.users(id) on delete cascade,
  receiver_id text not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self_request check (sender_id <> receiver_id)
);

create index if not exists idx_friend_requests_receiver_status
  on public.friend_requests(receiver_id, status, created_at desc);

create index if not exists idx_friend_requests_sender_status
  on public.friend_requests(sender_id, status, created_at desc);

create index if not exists idx_friend_requests_accepted_lookup
  on public.friend_requests(status, sender_id, receiver_id);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  actor_id text references public.users(id) on delete set null,
  type text not null,
  entity_type text not null,
  entity_id text not null,
  data_json jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created_at
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_is_read
  on public.notifications(user_id, is_read);

create table if not exists public.document_downloads (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  downloader_id text not null references public.users(id) on delete cascade,
  owner_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_downloads_document_id
  on public.document_downloads(document_id, created_at desc);

create index if not exists idx_document_downloads_owner_id
  on public.document_downloads(owner_id, created_at desc);
