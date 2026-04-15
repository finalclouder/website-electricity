create extension if not exists citext;

create table if not exists users (
  id text primary key,
  name text not null,
  email citext not null unique,
  password text not null,
  avatar text default '',
  bio text default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  author_id text not null references users(id) on delete cascade,
  content text not null,
  images jsonb not null default '[]'::jsonb,
  attachment_name text default '',
  category text not null default 'general' check (category in ('general', 'technical', 'safety', 'announcement')),
  shares integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  content text not null,
  parent_id text references comments(id) on delete cascade,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists likes (
  user_id text not null references users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table if not exists shares (
  user_id text not null references users(id) on delete cascade,
  post_id text not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists landing_config (
  id integer primary key check (id = 1),
  config_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key,
  title text not null,
  description text default '',
  author_id text not null references users(id) on delete cascade,
  data_snapshot text not null,
  status text not null default 'draft' check (status in ('draft', 'completed', 'approved')),
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_follows (
  follower_id text not null references users(id) on delete cascade,
  following_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create table if not exists friend_requests (
  id text primary key,
  sender_id text not null references users(id) on delete cascade,
  receiver_id text not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self_request check (sender_id <> receiver_id)
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  actor_id text references users(id) on delete set null,
  type text not null,
  entity_type text not null,
  entity_id text not null,
  data_json jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists document_downloads (
  id text primary key,
  document_id text not null references documents(id) on delete cascade,
  downloader_id text not null references users(id) on delete cascade,
  owner_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_author_id on posts(author_id);
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_comments_parent_id on comments(parent_id);
create index if not exists idx_comments_author_id on comments(author_id);
create index if not exists idx_likes_target on likes(target_type, target_id);
create index if not exists idx_shares_post_id on shares(post_id);
create index if not exists idx_documents_author_id on documents(author_id);
create index if not exists idx_documents_updated_at on documents(updated_at desc);
create index if not exists idx_user_follows_following_id on user_follows(following_id);
create index if not exists idx_friend_requests_receiver_status on friend_requests(receiver_id, status, created_at desc);
create index if not exists idx_friend_requests_sender_status on friend_requests(sender_id, status, created_at desc);
create index if not exists idx_friend_requests_accepted_lookup on friend_requests(status, sender_id, receiver_id);
create index if not exists idx_notifications_user_created_at on notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_is_read on notifications(user_id, is_read);
create index if not exists idx_document_downloads_document_id on document_downloads(document_id, created_at desc);
create index if not exists idx_document_downloads_owner_id on document_downloads(owner_id, created_at desc);
